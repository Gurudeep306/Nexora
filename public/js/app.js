/* ===== Nexora – Multi-Domain CS Learning Platform ===== */

const App = {
  editor: null,
  currentProblem: null,
  currentStatement: null,
  problemsState: { offset: 0, limit: 50, total: 0, sort: 'rating', order: 'asc', filters: {} },
  charts: {},
  _solveTab: 'description',
  _bottomTab: 'testcases',
  _previousAchievements: null,
  _aiBattle: null,
  _aiBattleTimer: null,
  _aiBattleStart: null,
  _replayEvents: [],
  _replayStartTime: null,
  _replayListener: null,
  _collabSocket: null,
  _collabRoom: null,
  _collabSuppressChange: false,
  _decompTimer: null,
  _debugMode: false,
  _focusMode: false,
  _cmdFiltered: [],
  _cmdSelectedIdx: 0,

  // Gamified solve state
  _solveTimerInterval: null,
  _solveSecondsElapsed: 0,
  _solveAttempts: 0,
  _solveCombo: 0,
  _comboPopupTimer: null,
  _baseXpReward: 0,

  // Language state
  _currentLang: 'cpp',
  _langIconMap: { cpp: 'icon-lang-cpp', python: 'icon-lang-python', java: 'icon-lang-java', javascript: 'icon-lang-js' },
  _langLabelMap: { cpp: 'C++20', python: 'Python 3', java: 'Java', javascript: 'JavaScript' },
  _monacoLangMap: { cpp: 'cpp', python: 'python', java: 'java', javascript: 'javascript' },

  // Social state
  _username: null,
  _socialSocket: null,
  _currentChatUser: null,
  _currentSolveRoom: null,
  _solveRoomEditor: null,
  _voiceEnabled: false,
  _voiceMuted: false,
  _peerConnections: {},
  _localStream: null,
  _onlineFriends: new Set(),

  /* ===== AVATAR ICON HELPER ===== */
  _avatarIconMap: {coder:'icon-avatar-coder',fox:'icon-avatar-fox',cat:'icon-avatar-cat',wolf:'icon-avatar-wolf',sword:'icon-sword',shield:'icon-shield',trophy:'icon-trophy',diamond:'icon-diamond',fire:'icon-fire',bolt:'icon-bolt',star:'icon-star',target:'icon-target',crown:'icon-crown',robot:'icon-robot',gamepad:'icon-gamepad',brain:'icon-brain',tree:'icon-tree',globe:'icon-globe',moon:'icon-moon',dragon:'icon-dragon'},
  _renderAvatar(avatar) {
    const cls = this._avatarIconMap[avatar];
    if (cls) return `<i class="${cls}"></i>`;
    if (avatar && avatar.length <= 4) return avatar;
    return `<i class="icon-avatar-coder"></i>`;
  },

  /* ===== ACHIEVEMENT ICON MAP ===== */
  _achieveIconMap: {
    sword: '<i class="icon-sword"></i>', fire: '<i class="icon-fire"></i>', shield: '<i class="icon-shield"></i>', dragon: '<i class="icon-dragon"></i>', muscle: '<i class="icon-muscle"></i>',
    target: '<i class="icon-target"></i>', trophy: '<i class="icon-trophy"></i>', crown: '<i class="icon-crown"></i>', globe: '<i class="icon-globe"></i>', lightning: '<i class="icon-bolt"></i>',
    diamond: '<i class="icon-diamond"></i>', moon: '<i class="icon-moon"></i>', sunrise: '<i class="icon-sunrise"></i>', flag: '<i class="icon-flag-finish"></i>', tags: '<i class="icon-tags"></i>',
    calendar: '<i class="icon-calendar"></i>', medal_green: '<i class="icon-medal" style="color:#22c55e"></i>', medal_blue: '<i class="icon-medal" style="color:#3b82f6"></i>', medal_purple: '<i class="icon-medal" style="color:#059669"></i>',
    medal_red: '<i class="icon-medal" style="color:#ef4444"></i>', star: '<i class="icon-star"></i>', bolt: '<i class="icon-bolt"></i>',
  },

  /* ========== Init ========== */
  async init() {
    // Boot screen animation
    this._bootSequence();

    window.addEventListener('hashchange', () => this.route());
    document.addEventListener('keydown', e => this.handleKeys(e));
    this.initResizer();
    await this._initSocial();
    await this._loadAndApplySettings();
    if (!location.hash) location.hash = '#/hub';
    else this.route();
    this._updateSidebarPlayer();
    // Auto-sync problems silently in background on every page load
    this._autoSync();

    // Dismiss boot screen after content loads
    setTimeout(() => this._dismissBoot(), 2800);
  },

  _bootSequence() {
    const bar = document.getElementById('bootBarFill');
    const status = document.getElementById('bootStatus');
    const cmd = document.getElementById('bootCmd');
    const modEl = document.getElementById('bootModules');
    const nodeEl = document.getElementById('bootNodes');
    const latEl = document.getElementById('bootLatency');
    const logEl = document.getElementById('bootLog');
    const keys = document.querySelectorAll('.boot-key');
    if (!bar || !status) return;

    // Matrix canvas background
    this._bootMatrix();

    const steps = [
      { pct: 8,  text: 'KERNEL BOOT', cmd: 'nexora --init --kernel', mods: 6,  nodes: 1, lat: 220, log: '[SYS] kernel v4.2.1 loaded', logType: 'ok', key: 0 },
      { pct: 18, text: 'NETWORK SYNC', cmd: 'net.connect(nexus://core)', mods: 24, nodes: 2, lat: 180, log: '[NET] handshake established', logType: 'ok', key: 1 },
      { pct: 32, text: 'LOADING MODULES', cmd: 'import { core, render, ai }', mods: 58, nodes: 4, lat: 142, log: '[SYS] 58 modules resolved', logType: 'ok' },
      { pct: 45, text: 'GPU INIT', cmd: 'gpu.compile(shaders/*.glsl)', mods: 89, nodes: 6, lat: 98,  log: '[GFX] WebGL2 renderer active', logType: 'ok', key: 2 },
      { pct: 58, text: 'AI SUBSYSTEM',  cmd: 'ai.load(model="nexora-v3")', mods: 112, nodes: 9, lat: 72, log: '[AI] neural engine online', logType: 'ok', key: 3 },
      { pct: 70, text: 'DATABASE LINK', cmd: 'db.sync(problems, progress)', mods: 138, nodes: 12, lat: 52, log: '[DB] 2847 records synced', logType: 'ok', key: 4 },
      { pct: 82, text: 'BUILDING GRAPH', cmd: 'graph.build(nodes=142)', mods: 158, nodes: 15, lat: 28,  log: '[SYS] knowledge graph ready', logType: 'ok' },
      { pct: 92, text: 'FINAL CHECKS',  cmd: 'verify --checksum --integrity', mods: 178, nodes: 17, lat: 12, log: '[SYS] all systems nominal', logType: 'ok' },
      { pct: 98, text: 'LAUNCHING',     cmd: 'nexora.launch()', mods: 186, nodes: 18, lat: 4,   log: '[>>>] entering the nexus...', logType: 'warn' },
    ];

    let i = 0;
    const typeCmd = (text, cb) => {
      if (!cmd) { cb && cb(); return; }
      cmd.textContent = '';
      let j = 0;
      const t = setInterval(() => {
        if (j >= text.length) { clearInterval(t); cb && cb(); return; }
        cmd.textContent += text[j]; j++;
      }, 18);
    };

    const animateNum = (el, target) => {
      if (!el) return;
      const start = parseInt(el.textContent) || 0;
      const diff = target - start;
      const dur = 400;
      const startT = performance.now();
      const step = (now) => {
        const p = Math.min((now - startT) / dur, 1);
        el.textContent = Math.round(start + diff * p);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const addLog = (text, type) => {
      if (!logEl) return;
      const line = document.createElement('div');
      line.className = 'boot-log-line';
      const colorClass = type === 'warn' ? 'warn' : type === 'err' ? 'err' : 'ok';
      line.innerHTML = text.replace(/\[(.*?)\]/, `[<span class="${colorClass}">$1</span>]`);
      logEl.appendChild(line);
      // Keep only last 4 lines visible
      while (logEl.children.length > 4) logEl.removeChild(logEl.firstChild);
    };

    const tick = setInterval(() => {
      if (i >= steps.length) { clearInterval(tick); return; }
      const s = steps[i];
      bar.style.width = s.pct + '%';
      status.textContent = s.text;
      typeCmd(s.cmd);
      animateNum(modEl, s.mods);
      animateNum(nodeEl, s.nodes);
      animateNum(latEl, s.lat);
      if (s.log) addLog(s.log, s.logType);
      if (s.key !== undefined && keys[s.key]) keys[s.key].classList.add('active');
      i++;
    }, 320);
  },

  _bootMatrix() {
    const canvas = document.getElementById('bootCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, cols, drops;
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const colors = ['#1d4ed8', '#14b8a6', '#10b981', '#3b82f6', '#0ea5e9'];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      cols = Math.floor(w / 14);
      drops = Array.from({ length: cols }, () => Math.random() * -100);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      ctx.fillStyle = 'rgba(2,6,16,0.08)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '12px monospace';

      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 14;
        const y = drops[i] * 14;

        // Head character: bright
        ctx.fillStyle = Math.random() > 0.85 ? '#5eead4' : colors[Math.floor(Math.random() * colors.length)];
        ctx.globalAlpha = 0.4 + Math.random() * 0.3;
        ctx.fillText(ch, x, y);
        ctx.globalAlpha = 1;

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5 + Math.random() * 0.5;
      }

      if (document.getElementById('bootScreen')) {
        requestAnimationFrame(draw);
      }
    }
    requestAnimationFrame(draw);
  },

  _dismissBoot() {
    const boot = document.getElementById('bootScreen');
    if (!boot) return;
    const bar = document.getElementById('bootBarFill');
    if (bar) bar.style.width = '100%';
    const status = document.getElementById('bootStatus');
    if (status) { status.textContent = '● SYSTEM ONLINE'; status.style.color = '#10b981'; }
    const cmd = document.getElementById('bootCmd');
    if (cmd) cmd.textContent = 'ready ✓';
    // Activate all remaining keys
    document.querySelectorAll('.boot-key').forEach(k => k.classList.add('active'));
    const modEl = document.getElementById('bootModules');
    const nodeEl = document.getElementById('bootNodes');
    const latEl = document.getElementById('bootLatency');
    if (modEl) modEl.textContent = '186';
    if (nodeEl) nodeEl.textContent = '18';
    if (latEl) latEl.textContent = '3';
    setTimeout(() => {
      boot.classList.add('fade-out');
      setTimeout(() => boot.remove(), 1000);
    }, 400);
  },

  async _autoSync() {
    try {
      const res = await API.sync('all');
      if (res.ok && res.inserted > 0) {
        this.toast(`[sync] pulled ${res.inserted} new problems`, 'info');
      }
    } catch {}
  },

  /* ========== Router ========== */
  route() {
    const hash = location.hash.slice(1) || '/dashboard';
    const parts = hash.split('/').filter(Boolean);
    const page = parts[0] || 'dashboard';
    const subId = parts[1] || null;

    // Highlight the primary nav item
    const navPage = page;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === navPage);
    });
    const content = document.getElementById('pageContent');
    // Page transition animation
    content.classList.remove('page-enter');
    void content.offsetWidth; // force reflow
    content.classList.add('page-enter');
    const sidebar = document.getElementById('sidebar');
    const isSubPage = (page === 'learn' && parts[2]) || (page === 'forge' && subId);
    if (isSubPage) {
      sidebar.classList.add('sidebar-minimized');
    } else {
      sidebar.classList.remove('sidebar-minimized');
    }
    switch (page) {
      case 'dashboard': this.renderHub(content); break;
      case 'problems': this.renderProblems(content); break;
      case 'nexus': this.renderNexus(content); break;
      case 'contests': this.renderContests(content); break;
      case 'ailab':
        if (subId) { this._openAiProblemPage(content, parseInt(subId)); }
        else { this._ailabView = 'grid'; this._ailabProblem = null; this.renderAILab(content); }
        break;
      case 'learn':
        if (subId) {
          const subId2 = parts[2] || null;
          if (subId2) { this._openTutorialPage(content, parseInt(subId2)); }
          else if (/^\d+$/.test(subId)) { this._openTutorialPage(content, parseInt(subId)); }
          else { this._learnSubject = subId; this.renderLearnTopics(content); }
        }
        else { this.renderLearn(content); }
        break;
      case 'forge':
        if (subId) { this._openForgePath(content, subId); }
        else { this.renderForge(content); }
        break;
      case 'workshop': this.renderWorkshop(content); break;
      case 'social': this.renderSocial(content); break;
      case 'hub': this.renderHub(content); break;
      default: this.renderHub(content);
    }
  },

  /* ========== Sidebar Player Card ========== */
  async _updateSidebarPlayer() {
    try {
      const data = await API.getStats();
      if (!data.ok) return;
      const lvl = data.level;
      document.getElementById('sidebarLevel').textContent = lvl.level;
      document.getElementById('sidebarTitle').textContent = lvl.name;
      document.getElementById('sidebarTitle').style.color = lvl.color;
      if (lvl.glow && lvl.glow !== 'none') document.getElementById('sidebarTitle').style.textShadow = lvl.glow;
      const pct = lvl.xpForNext > 0 ? Math.round(lvl.xpInLevel / lvl.xpForNext * 100) : 100;
      document.getElementById('sidebarXpFill').style.width = pct + '%';
      document.getElementById('sidebarXpFill').style.background = lvl.color;
      document.getElementById('sidebarXpText').textContent = data.totalXp + ' XP';

      // Update XP ring
      const ring = document.getElementById('sidebarXpRing');
      if (ring) {
        const circumference = 2 * Math.PI * 19; // r=19
        const offset = circumference * (1 - pct / 100);
        ring.style.strokeDashoffset = offset;
        ring.style.stroke = lvl.color;
      }

      // Update streak
      const streakEl = document.getElementById('sidebarStreak');
      if (streakEl && data.streak > 0) {
        streakEl.innerHTML = `<i class="icon-fire" style="width:10px;height:10px"></i> ${data.streak} day streak`;
      } else if (streakEl) {
        streakEl.innerHTML = '';
      }
    } catch {}
  },

  /* ===================================================
     COMMAND CENTER — Unified Hub (Dashboard + Profile)
     =================================================== */
  _hubTab: 'overview',

  // Section definitions for the customize panel
  _hubSections: [
    { key: 'today', label: 'daily.log', icon: 'icon-clock', desc: 'Progress rings & goal tracker' },
    { key: 'challenges', label: 'quests[]', icon: 'icon-sword', desc: 'Daily challenge missions' },
    { key: 'momentum', label: 'momentum', icon: 'icon-trending', desc: 'Rating climb & weekly bars' },
    { key: 'stats', label: 'sys.stats', icon: 'icon-chart', desc: 'Core metrics at a glance' },
    { key: 'streak', label: 'streak.log', icon: 'icon-fire', desc: 'Streak tracker & calendar' },
    { key: 'analytics', label: 'analytics', icon: 'icon-target', desc: 'Uptime, peaks & languages' },
    { key: 'activity', label: 'heatmap', icon: 'icon-calendar', desc: 'Activity heatmap & subs' },
    { key: 'charts', label: 'charts', icon: 'icon-arena', desc: 'Rating & verdict doughnuts' },
    { key: 'skillradar', label: 'skill.radar()', icon: 'icon-target', desc: 'Tag distribution & weak areas' },
    { key: 'battlelog', label: 'battle.log', icon: 'icon-sword', desc: 'Boss kills & speed analysis' },
    { key: 'insights', label: 'ai.insights', icon: 'icon-neural', desc: 'AI-generated perf tips' },
  ],

  async renderHub(el) {
    const activeTab = this._hubTab || 'overview';
    el.innerHTML = `
      <div class="hub-header">
        <div class="hub-header-left">
          <h1 class="hub-title"><i class="icon-dashboard" style="font-size:28px"></i> <span class="glitch" data-text="Command Center">Command Center</span></h1>
          <p class="hub-subtitle">sys.init() => load_modules(stats, profile, activity)</p>
        </div>
        <div class="hub-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.openSettings()"><i class="icon-settings" style="font-size:13px"></i> ./config</button>
          <button class="btn btn-secondary btn-sm" onclick="App.syncSolvedProblems()"><i class="icon-sync" style="font-size:13px"></i> git pull</button>
          <button class="btn btn-primary btn-sm" onclick="App._openCustomizePanel()" id="hubCustomizeBtn"><i class="icon-dashboard" style="font-size:13px"></i> layout</button>
        </div>
      </div>
      <div class="hub-tabs">
        <button class="hub-tab ${activeTab === 'overview' ? 'active' : ''}" onclick="App._switchHubTab('overview')">
          <i class="icon-dashboard"></i> ~/overview
        </button>
        <button class="hub-tab ${activeTab === 'profile' ? 'active' : ''}" onclick="App._switchHubTab('profile')">
          <i class="icon-profile"></i> /profile --achievements
        </button>
      </div>
      <div class="hub-content" id="hubContent"></div>`;

    const hubContent = document.getElementById('hubContent');
    if (activeTab === 'overview') {
      await this._renderHubOverview(hubContent);
    } else {
      await this._renderHubProfile(hubContent);
    }
  },

  _switchHubTab(tab) {
    this._hubTab = tab;
    // Animate tab switch
    const content = document.getElementById('hubContent');
    if (content) {
      content.classList.add('hub-content-exit');
      setTimeout(() => {
        this.renderHub(document.getElementById('pageContent'));
      }, 150);
    } else {
      this.renderHub(document.getElementById('pageContent'));
    }
  },

  async _renderHubProfile(el) {
    el.innerHTML = `
      <div class="hub-profile-section">
        <div class="hub-profile-hero" id="hubProfileHero">
          <div class="hub-profile-avatar" style="font-size:48px;display:flex;align-items:center;justify-content:center;width:80px;height:80px;background:var(--glass);border-radius:16px;border:1px solid var(--glass-border)"><i class="icon-profile"></i></div>
          <div class="hub-profile-info">
            <div class="hub-profile-stats-row" id="hubProfileQuickStats"></div>
          </div>
        </div>
        <div class="card mb-3" id="rankProgressionCard">
          <div class="card-header"><span class="card-title"><i class="icon-medal" style="font-size:16px"></i> rank.progression</span></div>
          <div class="rank-progression" id="rankProgression"></div>
        </div>
        <div class="card mb-3">
          <div class="card-header"><span class="card-title"><i class="icon-trophy" style="font-size:16px"></i> achievements[]</span>
            <span class="badge badge-xp" id="achieveCountBadge">0/0</span></div>
          <div class="achievements-grid" id="achievementsGrid"></div>
        </div>
        <div class="profile-grid">
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="icon-chart" style="font-size:16px"></i> platform.dist()</span></div>
            <div class="chart-container"><canvas id="platformChart"></canvas></div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="icon-star" style="font-size:16px"></i> player.stats</span></div>
            <div id="solveStats"></div>
          </div>
        </div>
      </div>`;

    const [stats, settings] = await Promise.all([API.getStats(), API.getSettings()]);
    if (!stats.ok) return;

    // Quick stats row in hero
    const qsEl = document.getElementById('hubProfileQuickStats');
    if (qsEl) {
      qsEl.innerHTML = `
        <div class="hub-pstat"><span class="hub-pstat-val">${stats.solved}</span><span class="hub-pstat-lbl">Solved</span></div>
        <div class="hub-pstat"><span class="hub-pstat-val">${stats.accuracy}%</span><span class="hub-pstat-lbl">Accuracy</span></div>
        <div class="hub-pstat"><span class="hub-pstat-val">${stats.totalXp.toLocaleString()}</span><span class="hub-pstat-lbl">Total XP</span></div>
        <div class="hub-pstat"><span class="hub-pstat-val">${stats.streak.current}</span><span class="hub-pstat-lbl">Day Streak</span></div>`;
    }

    // Rank Progression
    if (stats.allTitles?.length) {
      const rpEl = document.getElementById('rankProgression');
      let rpHtml = '';
      const currentLvl = stats.level.level;
      for (let i = 0; i < stats.allTitles.length; i++) {
        const t = stats.allTitles[i];
        const lvlNum = i + 1;
        const reached = currentLvl >= lvlNum;
        const isCurrent = currentLvl === lvlNum;
        rpHtml += `
          <div class="rank-node ${isCurrent ? 'rank-current' : ''}">
            <div class="rank-dot ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}" style="background:${t.color}${reached ? '' : ';opacity:0.3'};${reached && t.glow !== 'none' ? 'box-shadow:' + t.glow : ''}">
              <span class="rank-badge">${t.badge || ''}</span>
            </div>
            <div class="rank-name" style="color:${t.color}">${lvlNum}. ${t.title}</div>
            <div class="rank-xp">${t.min_xp.toLocaleString()} XP · ${(t.min_problems||0).toLocaleString()} solved</div>
          </div>`;
        if (i < stats.allTitles.length - 1) {
          rpHtml += `<div class="rank-connector ${reached ? 'reached' : ''}"></div>`;
        }
      }
      rpEl.innerHTML = rpHtml;
    }

    // Achievements
    const unlocked = stats.achievements.filter(a => a.unlocked_at).length;
    document.getElementById('achieveCountBadge').textContent = `${unlocked}/${stats.achievements.length}`;
    const achvGrid = document.getElementById('achievementsGrid');
    achvGrid.innerHTML = stats.achievements.map(a => {
      const isUnlocked = !!a.unlocked_at;
      const pct = Math.min(100, Math.round(a.progress / a.target * 100));
      const icon = this._achieveIconMap[a.icon] || '<i class="icon-medal"></i>';
      return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon-wrap">${icon}</div>
          <div class="achievement-title">${a.title}</div>
          <div class="achievement-desc">${a.description}</div>
          <div class="achievement-xp-reward">+${a.xp_reward || 0} XP</div>
          <div class="achievement-progress"><div class="achievement-progress-fill" style="width:${pct}%"></div></div>
          <div class="text-sm text-muted mt-2">${a.progress}/${a.target}</div>
        </div>`;
    }).join('');

    // Platform Chart
    if (stats.platformDist.length) {
      const ctx = document.getElementById('platformChart');
      if (this.charts.platform) this.charts.platform.destroy();
      this.charts.platform = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: stats.platformDist.map(d => d.platform === 'codeforces' ? 'Codeforces' : 'CodeChef'),
          datasets: [{ data: stats.platformDist.map(d => d.count), backgroundColor: ['#fcd34d', '#a78bfa'], borderWidth: 0 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } },
      });
    }

    // Statistics
    document.getElementById('solveStats').innerHTML = `
      <div style="display:grid;gap:12px;padding:12px 0">
        <div class="flex items-center gap-3">
          <span class="stat-icon green" style="width:36px;height:36px"><i class="icon-check" style="font-size:16px"></i></span>
          <div><div style="font-size:18px;font-weight:700">${stats.solved}</div><div class="text-sm text-muted">Problems Solved</div></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="stat-icon amber" style="width:36px;height:36px"><i class="icon-target" style="font-size:16px"></i></span>
          <div><div style="font-size:18px;font-weight:700">${stats.accuracy}%</div><div class="text-sm text-muted">Accuracy</div></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="stat-icon purple" style="width:36px;height:36px"><i class="icon-bolt" style="font-size:16px"></i></span>
          <div><div style="font-size:18px;font-weight:700">${stats.totalXp}</div><div class="text-sm text-muted">Total XP</div></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="stat-icon blue" style="width:36px;height:36px"><i class="icon-fire" style="font-size:16px"></i></span>
          <div><div style="font-size:18px;font-weight:700">${stats.streak.current}</div><div class="text-sm text-muted">Day Streak (Best: ${stats.streak.best})</div></div>
        </div>
      </div>`;
  },

  async _renderHubOverview(el) {
    const layoutData = await API.getDashboardLayout();
    const layout = layoutData.ok ? layoutData.layout : {};
    const isHidden = (section) => layout[section] === false;

    // Determine section order
    const defaultOrder = this._hubSections.map(s => s.key);
    const order = Array.isArray(layout._order) ? layout._order.filter(k => defaultOrder.includes(k)) : defaultOrder;
    // Add any missing sections at the end
    for (const k of defaultOrder) { if (!order.includes(k)) order.push(k); }

    // Section HTML templates
    const sectionHtml = {
      today: `<div id="todaySummarySection"></div>`,
      challenges: `<div id="dailyChallengesSection"></div>`,
      momentum: `<div id="momentumSection"></div>`,
      stats: `<div class="stats-grid" id="statsGrid"></div>`,
      streak: `<div id="streakSection"></div>`,
      analytics: `<div id="analyticsSection"></div>`,
      activity: `<div class="card">
          <div class="card-header">
            <span class="card-title"><i class="icon-calendar" style="font-size:16px"></i> heatmap.render()</span>
            <span class="text-sm text-muted" id="heatmapLabel"></span>
          </div>
          <div class="heatmap-container" id="heatmapContainer"></div>
        </div>`,
      charts: `<div class="dashboard-grid mt-3">
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="icon-chart" style="font-size:16px"></i> rating.dist()</span></div>
            <div class="chart-container"><canvas id="ratingChart"></canvas></div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="icon-target" style="font-size:16px"></i> verdict.analysis()</span></div>
            <div class="chart-container"><canvas id="verdictChart"></canvas></div>
          </div>
        </div>`,
      skillradar: `<div id="skillRadarSection"></div>`,
      battlelog: `<div id="battleLogSection"></div>`,
      insights: `<div id="performanceInsights"></div>`,
    };

    // Build sections in the user's order, skip hidden ones
    let sectionsMarkup = '';
    for (const key of order) {
      if (isHidden(key)) continue;
      sectionsMarkup += `<div class="dash-section" data-section="${key}">${sectionHtml[key] || ''}</div>\n`;
    }

    el.innerHTML = `<div id="playerHud"></div>${sectionsMarkup}`;

    await this._populateDashboardData();
  },

  /* ===================================================
     DASHBOARD DATA POPULATION (extracted from renderDashboard)
     =================================================== */
  async _populateDashboardData() {

    // Fetch both APIs in parallel
    const [data, perf] = await Promise.all([API.getStats(), API.getPerformance()]);
    if (!data.ok) return;
    const p = perf.ok ? perf : {};

    this._previousAchievements = data.achievements;

    /* ═══════════════════════════════════════════════
       1. HERO HUD — Animated level ring + gates + ETA
       ═══════════════════════════════════════════════ */
    const lvl = data.level;
    const title = data.title;
    const xpPct = lvl.xpForNext > 0 ? Math.min(Math.round(lvl.xpInLevel / lvl.xpForNext * 100), 100) : 100;
    const probPct = lvl.probsForNext > 0 ? Math.min(Math.round(lvl.probsInLevel / lvl.probsForNext * 100), 100) : 100;
    const nextLvl = p.nextLevel;

    let gateHtml = '';
    if (title.next) {
      const hudGates = [];
      if (title.xpToNext > 0) hudGates.push(`${title.xpToNext.toLocaleString()} XP`);
      if (title.probsToNext > 0) hudGates.push(`${title.probsToNext} problems`);
      gateHtml = `<div class="hud-gates">
        <div class="hud-gate"><div class="hud-gate-fill" style="width:${xpPct}%;background:${lvl.color}"></div><span>${data.totalXp.toLocaleString()}/${(data.totalXp + (title.xpToNext || 0)).toLocaleString()} XP</span></div>
        <div class="hud-gate"><div class="hud-gate-fill" style="width:${probPct}%;background:${lvl.color}"></div><span>${data.solved}/${data.solved + (title.probsToNext || 0)} Problems</span></div>
      </div>
      <div class="next-rank-preview">
        <span class="next-rank-label">Next:</span>
        <span class="next-rank-name" style="color:${title.next.color}">${this._esc(title.next.title)}</span>
        ${nextLvl?.daysEstimate != null ? `<span class="next-rank-eta"><i class="icon-clock" style="font-size:10px"></i> ~${nextLvl.daysEstimate}d at current pace</span>` : ''}
      </div>`;
    }

    document.getElementById('playerHud').innerHTML = `
      <div class="player-hud card">
        <div class="hud-left">
          <div class="hud-ring-wrap" style="--ring-color:${lvl.color};--ring-pct:${xpPct}">
            <div class="hud-level-ring">
              <div class="hud-level-badge" style="background:${lvl.color};${lvl.glow !== 'none' ? 'box-shadow:' + lvl.glow : ''}">${lvl.level}</div>
            </div>
          </div>
          <div class="hud-info">
            <div class="hud-title" style="color:${lvl.color};${lvl.glow !== 'none' ? 'text-shadow:' + lvl.glow : ''}">${this._esc(title.current.title)}</div>
            <div class="hud-xp-row">
              <div class="hud-xp-bar"><div class="hud-xp-fill" style="width:${xpPct}%;background:${lvl.color}"></div></div>
              <span class="hud-xp-text">${data.totalXp.toLocaleString()} XP</span>
            </div>
            ${gateHtml}
          </div>
        </div>
        <div class="hud-stats">
          <div class="hud-stat-pill"><i class="icon-check" style="color:var(--success)"></i><span class="hud-stat-num">${data.solved}</span><span class="hud-stat-lbl">Solved</span></div>
          <div class="hud-stat-pill"><i class="icon-fire" style="color:var(--warning)"></i><span class="hud-stat-num">${data.streak.current}d</span><span class="hud-stat-lbl">Streak</span></div>
          <div class="hud-stat-pill"><i class="icon-target" style="color:var(--info)"></i><span class="hud-stat-num">${data.accuracy}%</span><span class="hud-stat-lbl">Accuracy</span></div>
          <div class="hud-stat-pill"><i class="icon-trending" style="color:#14b8a6"></i><span class="hud-stat-num">${p.consistencyScore || 0}%</span><span class="hud-stat-lbl">Consist.</span></div>
        </div>
      </div>`;

    /* ═══════════════════════════════════════════════
       2. TODAY'S COMMAND CENTER
       ═══════════════════════════════════════════════ */
    const ts = data.todayStats;
    const dailyGoal = 3;
    const todayPct = Math.min(100, Math.round((ts.solved / dailyGoal) * 100));
    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
    const todayEl = document.getElementById('todaySummarySection');
    if (todayEl) {
      const ringPath = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';
      const todayAccuracy = ts.attempted > 0 ? Math.round(ts.solved / ts.attempted * 100) : 0;
      todayEl.innerHTML = `
        <div class="card mt-3 today-summary-card">
          <div class="today-header">
            <div class="today-greeting"><h2>${greeting}!</h2><p class="text-muted">Here\u2019s your progress for today</p></div>
            <div class="today-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>
          <div class="today-metrics">
            <div class="today-metric">
              <div class="today-metric-ring">
                <svg viewBox="0 0 36 36" class="today-ring-svg">
                  <path d="${ringPath}" fill="none" stroke="var(--surface-2)" stroke-width="3"/>
                  <path d="${ringPath}" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="${todayPct}, 100" stroke-linecap="round" class="today-ring-fill"/>
                </svg>
                <span class="today-ring-val">${ts.solved}</span>
              </div>
              <span class="today-metric-label">Solved</span>
              <span class="today-metric-sub">Goal: ${dailyGoal}/day</span>
            </div>
            <div class="today-metric">
              <div class="today-metric-ring">
                <svg viewBox="0 0 36 36" class="today-ring-svg">
                  <path d="${ringPath}" fill="none" stroke="var(--surface-2)" stroke-width="3"/>
                  <path d="${ringPath}" fill="none" stroke="var(--brand)" stroke-width="3" stroke-dasharray="${todayAccuracy}, 100" stroke-linecap="round" class="today-ring-fill"/>
                </svg>
                <span class="today-ring-val">${ts.attempted}</span>
              </div>
              <span class="today-metric-label">Attempted</span>
              <span class="today-metric-sub">${todayAccuracy}% success</span>
            </div>
            <div class="today-metric">
              <div class="today-metric-ring">
                <svg viewBox="0 0 36 36" class="today-ring-svg">
                  <path d="${ringPath}" fill="none" stroke="var(--surface-2)" stroke-width="3"/>
                  <path d="${ringPath}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="${Math.min(100, ts.xp)}, 100" stroke-linecap="round" class="today-ring-fill"/>
                </svg>
                <span class="today-ring-val">${ts.xp}</span>
              </div>
              <span class="today-metric-label">XP Earned</span>
              <span class="today-metric-sub">today</span>
            </div>
            <div class="today-metric">
              <div class="today-metric-ring">
                <svg viewBox="0 0 36 36" class="today-ring-svg">
                  <path d="${ringPath}" fill="none" stroke="var(--surface-2)" stroke-width="3"/>
                  <path d="${ringPath}" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="${Math.min(100, data.streak.current * 15)}, 100" stroke-linecap="round" class="today-ring-fill"/>
                </svg>
                <span class="today-ring-val">${data.streak.current}</span>
              </div>
              <span class="today-metric-label">Streak</span>
              <span class="today-metric-sub">Best: ${data.streak.best}</span>
            </div>
          </div>
          ${ts.solved >= dailyGoal ? '<div class="today-goal-hit"><i class="icon-check" style="color:var(--success)"></i> Daily goal reached!</div>' : `<div class="today-goal-bar"><div class="today-goal-fill" style="width:${todayPct}%"></div><span>${ts.solved}/${dailyGoal} daily goal</span></div>`}
        </div>`;
    }

    /* ═══════════════════════════════════════════════
       3. DAILY CHALLENGES (enhanced with tier badges)
       ═══════════════════════════════════════════════ */
    const dcEl = document.getElementById('dailyChallengesSection');
    if (data.dailyChallenges && data.dailyChallenges.length) {
      const tiers = ['Easy', 'Medium', 'Hard'];
      const tierIcons = ['icon-check', 'icon-bolt', 'icon-fire'];
      let dcHtml = '<div class="daily-grid mt-3">';
      data.dailyChallenges.forEach((dc, i) => {
        const solved = dc.solve_status === 'solved';
        dcHtml += `
          <div class="daily-card ${solved ? 'completed' : ''}" onclick="App.openSolve(${dc.id})">
            <div class="daily-top">
              <div class="daily-difficulty ${tiers[i].toLowerCase()}"><i class="${tierIcons[i]}" style="font-size:10px"></i> ${tiers[i]} Challenge</div>
              ${solved ? '<div class="daily-check"><i class="icon-check"></i></div>' : ''}
            </div>
            <div class="daily-problem-title">${this._esc(dc.title)}</div>
            <div class="daily-bottom">
              <span class="${this._ratingClass(dc.rating)}">${dc.rating || '?'}</span>
              <span class="daily-reward"><i class="icon-bolt" style="font-size:11px"></i> +${dc.xp_reward || (i + 1) * 10} XP</span>
            </div>
          </div>`;
      });
      dcHtml += '</div>';
      dcEl.innerHTML = dcHtml;
    } else {
      dcEl.innerHTML = '<div class="empty-state mt-3"><p>// run `git pull` to sync problem database first</p></div>';
    }

    /* ═══════════════════════════════════════════════
       5. MOMENTUM — Rating Climb + Weekly Progress side by side
       ═══════════════════════════════════════════════ */
    const momEl = document.getElementById('momentumSection');
    if (momEl) {
      let momHtml = '<div class="dashboard-grid mt-3">';

      // 5a. Rating Climb Sparkline
      const climb = p.ratingClimb || [];
      momHtml += '<div class="card"><div class="card-header"><span class="card-title"><i class="icon-trending" style="font-size:16px"></i> rating.climb()</span>';
      if (climb.length) momHtml += `<span class="text-sm text-muted">${climb.length} problems</span>`;
      momHtml += '</div><div style="padding:0 16px 16px">';
      if (climb.length >= 2) {
        const cW = 500, cH = 120, cPx = 30, cPy = 12;
        const cMinR = Math.min(...climb.map(c => c.rating));
        const cMaxR = Math.max(...climb.map(c => c.rating));
        const cRange = Math.max(cMaxR - cMinR, 100);
        const cPts = climb.map((c, i) => {
          const x = cPx + (i / (climb.length - 1)) * (cW - 2 * cPx);
          const y = cPy + (1 - (c.rating - cMinR) / cRange) * (cH - 2 * cPy);
          return { x, y, r: c.rating };
        });
        const cLine = cPts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
        const cArea = cLine + ` L ${cPts[cPts.length-1].x.toFixed(1)} ${cH} L ${cPts[0].x.toFixed(1)} ${cH} Z`;
        momHtml += `<svg viewBox="0 0 ${cW} ${cH}" style="width:100%;height:auto" preserveAspectRatio="none">
          <defs><linearGradient id="dashClimbG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--brand)" stop-opacity="0.25"/><stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
          ${[0, 0.5, 1].map(f => { const y = cPy + f * (cH - 2 * cPy); const v = Math.round(cMaxR - f * cRange); return `<line x1="${cPx}" y1="${y}" x2="${cW-cPx}" y2="${y}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="4 3"/><text x="${cPx-3}" y="${y+3}" text-anchor="end" fill="var(--text-muted)" font-size="8" font-family="JetBrains Mono,monospace">${v}</text>`; }).join('')}
          <path d="${cArea}" fill="url(#dashClimbG)"/>
          <path d="${cLine}" fill="none" stroke="var(--brand)" stroke-width="2"/>
          <circle cx="${cPts[cPts.length-1].x}" cy="${cPts[cPts.length-1].y}" r="3.5" fill="var(--brand)" stroke="var(--bg)" stroke-width="2"/>
        </svg>`;
      } else {
        momHtml += '<div class="empty-state" style="padding:20px"><p>// need more data points to render graph</p></div>';
      }
      momHtml += '</div></div>';

      // 5b. Weekly Momentum
      const weekly = p.weeklyProgress || [];
      momHtml += '<div class="card"><div class="card-header"><span class="card-title"><i class="icon-chart" style="font-size:16px"></i> weekly.momentum</span>';
      if (weekly.length) momHtml += `<span class="text-sm text-muted">${weekly.length} weeks</span>`;
      momHtml += '</div><div style="padding:0 16px 16px">';
      if (weekly.length) {
        const wMax = Math.max(...weekly.map(w => w.solved), 1);
        momHtml += '<div class="dash-weekly-bars">';
        for (const w of weekly) {
          const h = Math.max(Math.round(w.solved / wMax * 100), 4);
          const weekNum = w.week.split('W')[1] || '?';
          momHtml += `<div class="dash-weekly-col" title="W${weekNum}: ${w.solved} solved, ${w.xp} XP, ${w.activeDays}/7 active">
            <div class="dash-weekly-bar" style="height:${h}%"><span class="dash-weekly-val">${w.solved}</span></div>
            <div class="dash-weekly-lbl">W${weekNum}</div>
          </div>`;
        }
        momHtml += '</div>';
      } else {
        momHtml += '<div class="empty-state" style="padding:20px"><p>// logging starts after week 1</p></div>';
      }
      momHtml += '</div></div>';
      momHtml += '</div>';
      momEl.innerHTML = momHtml;
    }

    /* ═══════════════════════════════════════════════
       6. STATS GRID (6 cards)
       ═══════════════════════════════════════════════ */
    document.getElementById('statsGrid').innerHTML = `
      ${this._statCard('icon-check', 'green', data.solved, 'Problems Solved')}
      ${this._statCard('icon-bolt', 'purple', data.totalXp.toLocaleString(), 'Total XP')}
      ${this._statCard('icon-target', 'blue', data.accuracy + '%', 'Accuracy')}
      ${this._statCard('icon-fire', 'amber', data.streak.current + ' days', 'Current Streak')}
      ${this._statCard('icon-code', 'brand', data.submissions, 'Submissions')}
      ${this._statCard('icon-trending', 'pink', (p.consistencyScore || 0) + '%', 'Consistency')}`;
    // Trigger count-up animations
    setTimeout(() => this._animateCountUps(), 100);

    /* ═══════════════════════════════════════════════
       7. STREAK TRACKER (enhanced with calendar)
       ═══════════════════════════════════════════════ */
    const streak = data.streak;
    const streakEl = document.getElementById('streakSection');
    let streakHtml = `<div class="card mt-3">
      <div class="card-header">
        <span class="card-title"><i class="icon-fire" style="font-size:16px;color:var(--warning)"></i> ${streak.current}d streak</span>
        <span class="text-sm text-muted">Best: ${streak.best} days</span>
      </div>
      <div style="padding:12px 16px">
        <div class="streak-week">`;
    for (const d2 of streak.lastWeek) {
      const dayName = ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(d2.date).getDay()];
      const isToday = d2.date === new Date().toISOString().slice(0, 10);
      streakHtml += `<div class="streak-day ${d2.solved > 0 ? 'active' : ''} ${isToday ? 'today' : ''}">
        <div class="streak-day-label">${dayName}</div>
        <div class="streak-day-dot" style="${d2.solved > 0 ? 'background:var(--warning)' : ''}"></div>
        <div class="streak-day-count">${d2.solved}</div>
      </div>`;
    }
    streakHtml += '</div>';

    // Streak milestones
    const streakMilestones = [3, 7, 14, 30, 60, 100, 365];
    const nextMilestone = streakMilestones.find(m => m > streak.current) || 365;
    const mPct = Math.min(100, Math.round(streak.current / nextMilestone * 100));
    streakHtml += `<div class="streak-milestone mt-2">
      <div class="streak-milestone-bar"><div class="streak-milestone-fill" style="width:${mPct}%"></div></div>
      <span class="streak-milestone-text">${streak.current}/${nextMilestone} day milestone</span>
    </div>`;
    streakHtml += '</div></div>';
    streakEl.innerHTML = streakHtml;

    /* ═══════════════════════════════════════════════
       8. ANALYTICS — Consistency + Peak Hours + Languages
       ═══════════════════════════════════════════════ */
    const analyticsEl = document.getElementById('analyticsSection');
    if (analyticsEl) {
      let aHtml = '<div class="dash-analytics-grid mt-3">';

      // 8a. Consistency Ring
      const cs = p.consistencyScore || 0;
      const csColor = cs >= 70 ? 'var(--success)' : cs >= 40 ? 'var(--warning)' : 'var(--danger)';
      aHtml += `<div class="card dash-analytics-card">
        <div class="card-header"><span class="card-title"><i class="icon-trending" style="font-size:14px"></i> uptime</span></div>
        <div class="dash-consist-wrap">
          <svg viewBox="0 0 36 36" class="dash-consist-ring">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--surface-2)" stroke-width="3"/>
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${csColor}" stroke-width="3" stroke-dasharray="${cs}, 100" stroke-linecap="round" class="today-ring-fill"/>
          </svg>
          <span class="dash-consist-val" style="color:${csColor}">${cs}%</span>
        </div>
        <div class="dash-consist-sub">Active days in last 30</div>
        <div class="dash-consist-avg"><span>${p.avgDailySolves || 0}</span> avg solves/day · <span>${p.avgDailyXp || 0}</span> avg XP/day</div>
      </div>`;

      // 8b. Peak Hours
      const hours = p.hourDist || [];
      if (hours.length) {
        const maxHr = Math.max(...hours.map(h => h.total), 1);
        const peakHr = hours.reduce((best, h) => h.ac > (best?.ac || 0) ? h : best, null);
        const peakLabel = peakHr ? (peakHr.hour > 12 ? (peakHr.hour - 12) + ' PM' : peakHr.hour === 0 ? '12 AM' : peakHr.hour + ' AM') : '?';
        aHtml += `<div class="card dash-analytics-card">
          <div class="card-header"><span class="card-title"><i class="icon-clock" style="font-size:14px"></i> peak_hours</span>
            <span class="text-sm text-muted">Best: ${peakLabel}</span></div>
          <div class="dash-hours">`;
        for (let h = 0; h < 24; h++) {
          const entry = hours.find(x => x.hour === h) || { total: 0, ac: 0 };
          const intensity = entry.total / maxHr;
          const col = intensity > 0.7 ? 'var(--brand)' : intensity > 0.4 ? 'rgba(29,78,216,0.5)' : intensity > 0 ? 'rgba(29,78,216,0.2)' : 'rgba(255,255,255,0.04)';
          const label = h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h-12) + 'p';
          aHtml += `<div class="dash-hour" title="${label}: ${entry.total} subs" style="--h:${Math.max(intensity * 100, 6)}%;--hc:${col}">
            <div class="dash-hour-bar"></div>
            ${h % 6 === 0 ? `<span class="dash-hour-lbl">${label}</span>` : ''}
          </div>`;
        }
        aHtml += '</div></div>';
      } else {
        aHtml += `<div class="card dash-analytics-card">
          <div class="card-header"><span class="card-title"><i class="icon-clock" style="font-size:14px"></i> peak_hours</span></div>
          <div class="empty-state" style="padding:20px"><p>// no data — submit solutions to map patterns</p></div>
        </div>`;
      }

      // 8c. Top Languages
      const langs = p.langUsage || [];
      aHtml += `<div class="card dash-analytics-card">
        <div class="card-header"><span class="card-title"><i class="icon-code" style="font-size:14px"></i> lang.stats()</span></div>`;
      if (langs.length) {
        const totalLang = langs.reduce((s, l) => s + l.count, 0) || 1;
        const langColors = { cpp: '#00599C', python: '#3776AB', java: '#f89820', javascript: '#f7df1e', c: '#555', rust: '#ce412b', go: '#00ADD8', kotlin: '#7F52FF' };
        aHtml += '<div class="dash-langs">';
        for (const l of langs.slice(0, 4)) {
          const pct = Math.round(l.count / totalLang * 100);
          const acRate = l.count > 0 ? Math.round(l.acCount / l.count * 100) : 0;
          const col = langColors[l.language] || 'var(--brand)';
          aHtml += `<div class="dash-lang-row">
            <span class="dash-lang-name" style="color:${col}">${this._esc((l.language || '?').toUpperCase())}</span>
            <div class="dash-lang-bar-wrap"><div class="dash-lang-bar" style="width:${pct}%;background:${col}"></div></div>
            <span class="dash-lang-stat">${pct}% <span class="text-muted">(${acRate}% AC)</span></span>
          </div>`;
        }
        aHtml += '</div>';
      } else {
        aHtml += '<div class="empty-state" style="padding:20px"><p>// stdin empty — no submissions in pipeline</p></div>';
      }
      aHtml += '</div>';

      aHtml += '</div>';
      analyticsEl.innerHTML = aHtml;
    }

    /* ═══════════════════════════════════════════════
       9. ACTIVITY — Interactive Heatmap
       ═══════════════════════════════════════════════ */
    this.renderHeatmap(data.heatmap);

    /* ═══════════════════════════════════════════════
       10. CHARTS — Rating & Verdict Doughnuts
       ═══════════════════════════════════════════════ */
    this.renderRatingChart(data.ratingDist);
    this.renderVerdictChart(data.verdicts);

    /* ═══════════════════════════════════════════════
       10b. SKILL RADAR — Tag-based skill breakdown
       ═══════════════════════════════════════════════ */
    const srEl = document.getElementById('skillRadarSection');
    if (srEl) {
      const tags = p.tagAnalysis || [];
      if (tags.length >= 3) {
        // Top 8 tags by volume, render horizontal bars with solve rate
        const top = [...tags].sort((a, b) => b.total - a.total).slice(0, 8);
        const maxTotal = Math.max(...top.map(t => t.total), 1);
        let srHtml = `<div class="card mt-3">
          <div class="card-header"><span class="card-title"><i class="icon-target" style="font-size:16px"></i> skill.radar()</span>
            <span class="text-sm text-muted">${tags.length} topics tracked</span></div>
          <div class="skill-radar-body">`;
        for (const t of top) {
          const pct = Math.round(t.total / maxTotal * 100);
          const rateColor = t.solveRate >= 70 ? 'var(--success)' : t.solveRate >= 40 ? 'var(--warning)' : 'var(--danger)';
          srHtml += `<div class="skill-bar-row">
            <div class="skill-bar-label">${this._esc(t.tag)}</div>
            <div class="skill-bar-track">
              <div class="skill-bar-fill" style="width:${pct}%">
                <div class="skill-bar-solved" style="width:${t.solveRate}%"></div>
              </div>
            </div>
            <div class="skill-bar-stats">
              <span class="skill-bar-rate" style="color:${rateColor}">${t.solveRate}%</span>
              <span class="skill-bar-count">${t.solved}/${t.total}</span>
            </div>
          </div>`;
        }

        // Weak areas call-out
        const weak = tags.filter(t => t.solveRate < 50 && t.total >= 3).slice(0, 3);
        if (weak.length) {
          srHtml += '<div class="skill-weak-callout">';
          srHtml += '<div class="skill-weak-title"><i class="icon-bolt" style="color:var(--warning)"></i> // TODO: level up these</div>';
          weak.forEach(w => {
            srHtml += `<div class="skill-weak-tag"><span>${this._esc(w.tag)}</span><span class="skill-weak-rate">${w.solveRate}% solve rate</span></div>`;
          });
          srHtml += '</div>';
        }

        srHtml += '</div></div>';
        srEl.innerHTML = srHtml;
      } else {
        srEl.innerHTML = '<div class="card mt-3"><div class="card-header"><span class="card-title"><i class="icon-target" style="font-size:16px"></i> skill.radar()</span></div><div class="empty-state" style="padding:24px"><p>// insufficient data — solve 3+ topic types to render radar</p></div></div>';
      }
    }

    /* ═══════════════════════════════════════════════
       10c. BATTLE LOG — Hardest solves, solve speed, struggles
       ═══════════════════════════════════════════════ */
    const blEl = document.getElementById('battleLogSection');
    if (blEl) {
      let blHtml = '<div class="dashboard-grid mt-3">';

      // Hardest Solved
      const hardest = p.hardestSolved || [];
      blHtml += `<div class="card"><div class="card-header"><span class="card-title"><i class="icon-fire" style="font-size:16px;color:var(--danger)"></i> boss_kills[]</span></div>`;
      if (hardest.length) {
        blHtml += '<div class="battle-list">';
        hardest.forEach((h, i) => {
          blHtml += `<div class="battle-item" onclick="App.openSolve(${h.id})">
            <div class="battle-rank">#${i + 1}</div>
            <div class="battle-info">
              <div class="battle-title">${this._esc(h.title)}</div>
              <div class="battle-meta">${this._ratingBadge(h.rating)} · ${h.platform} · ${h.attempts || 1} attempt${(h.attempts || 1) !== 1 ? 's' : ''}</div>
            </div>
          </div>`;
        });
        blHtml += '</div>';
      } else {
        blHtml += '<div class="empty-state" style="padding:20px"><p>// kill_list empty — no defeats logged yet</p></div>';
      }
      blHtml += '</div>';

      // Solve Speed Analysis
      const speed = p.solveSpeed || [];
      blHtml += `<div class="card"><div class="card-header"><span class="card-title"><i class="icon-clock" style="font-size:16px;color:var(--brand-light)"></i> solve.speed()</span></div>`;
      if (speed.length) {
        const maxAttempts = Math.max(...speed.map(s => s.avgAttempts), 1);
        blHtml += '<div class="speed-chart">';
        speed.forEach(s => {
          const barH = Math.max(Math.round(s.avgAttempts / maxAttempts * 100), 8);
          blHtml += `<div class="speed-col" title="${s.bracket}: avg ${s.avgAttempts} attempts, ${s.avgMinutes || '?'} min, ${s.count} solved">
            <div class="speed-bar" style="height:${barH}%">
              <span class="speed-val">${s.avgAttempts}</span>
            </div>
            <div class="speed-lbl">${s.bracket.split('-')[0]}</div>
          </div>`;
        });
        blHtml += '</div><div class="speed-legend">Rating bracket → avg attempts to solve</div>';
      } else {
        blHtml += '<div class="empty-state" style="padding:20px"><p>// benchmarks pending — solve rated problems</p></div>';
      }
      blHtml += '</div>';

      blHtml += '</div>';
      blEl.innerHTML = blHtml;
    }

    /* ═══════════════════════════════════════════════
       11. PERFORMANCE INSIGHTS (enriched with perf data)
       ═══════════════════════════════════════════════ */
    const insightEl = document.getElementById('performanceInsights');
    if (insightEl) {
      const insights = [];

      // Streak insights
      if (data.streak.current >= 7) insights.push({icon:'icon-fire',color:'#f59e0b',title:`${data.streak.current}d streak — on fire`,desc:'// elite consistency detected. keep the process alive.'});
      else if (data.streak.current === 0 && data.solved > 0) insights.push({icon:'icon-clock',color:'#94a3b8',title:'streak.reset()',desc:'// streak broke. solve one problem to respawn it.'});

      // Daily goal
      if (ts.solved >= dailyGoal) insights.push({icon:'icon-check',color:'#22c55e',title:'daily_goal.reached()',desc:`// ${dailyGoal} problems cleared today. mission complete.`});

      // Accuracy analysis
      if (data.accuracy < 50 && data.submissions > 5) insights.push({icon:'icon-target',color:'#ef4444',title:'accuracy < 50%',desc:'// WARNING: read constraints, test edge cases before push.'});
      else if (data.accuracy >= 80 && data.submissions > 10) insights.push({icon:'icon-target',color:'#22c55e',title:'accuracy: ' + data.accuracy + '%',desc:'// exceptional hit rate. rarely pushing bad code.'});

      // Difficulty range
      const easyCount = data.ratingDist.filter(d2 => d2.tier === 'Newbie' || d2.tier === 'Pupil').reduce((s, d2) => s + d2.count, 0);
      const hardCount = data.ratingDist.filter(d2 => ['Expert','Candidate Master','Master','Grandmaster'].includes(d2.tier)).reduce((s, d2) => s + d2.count, 0);
      if (data.solved > 10 && hardCount < easyCount * 0.1) insights.push({icon:'icon-chart',color:'#3b82f6',title:'difficulty.increase()',desc:'// most solves are < 1200. push to 1400+ to level up faster.'});
      if (data.solved > 10 && hardCount >= easyCount * 0.3) insights.push({icon:'icon-bolt',color:'#059669',title:'difficulty.balanced()',desc:'// strong difficulty spread detected. solid approach.'});

      // Verdict patterns
      const waCount = data.verdicts.find(v => v.verdict === 'WA')?.count || 0;
      const acCount = data.verdicts.find(v => v.verdict === 'AC')?.count || 0;
      const tleCount = data.verdicts.find(v => v.verdict === 'TLE')?.count || 0;
      if (waCount > acCount && data.submissions > 5) insights.push({icon:'icon-cross',color:'#ef4444',title:'WA > AC',desc:'// fix: check edge cases, boundaries, off-by-one errors.'});
      if (tleCount > acCount * 0.2 && data.submissions > 5) insights.push({icon:'icon-clock',color:'#f59e0b',title:'TLE frequent',desc:'// optimize: try binary search, segment trees, memoization.'});

      // Consistency insight
      if (p.consistencyScore >= 80) insights.push({icon:'icon-trending',color:'#14b8a6',title:'uptime: ' + p.consistencyScore + '%',desc:'// active ' + Math.round(p.consistencyScore * 30 / 100) + '/30 days. legendary.'});
      else if (p.consistencyScore > 0 && p.consistencyScore < 30) insights.push({icon:'icon-trending',color:'#f97316',title:'uptime: ' + p.consistencyScore + '%',desc:'// low consistency. daily practice > weekend grinds.'});

      // Hardest solved
      const hardest = p.hardestSolved || [];
      if (hardest.length && hardest[0].rating >= 1600) insights.push({icon:'icon-arena',color:'#059669',title:`boss_kill: ${hardest[0].rating}`,desc:`// defeated "${hardest[0].title}" — ${hardest[0].rating}-rated. respect.`});

      // Getting started
      if (data.solved === 0) insights.push({icon:'icon-spark',color:'var(--brand)',title:'boot_sequence',desc:'// welcome, pilot. navigate to Problems and score your first kill.'});

      if (insights.length) {
        insightEl.innerHTML = `
          <div class="card mt-3">
            <div class="card-header"><span class="card-title"><i class="icon-lightbulb" style="font-size:16px"></i> ai.insights()</span>
              <span class="text-sm text-muted">${insights.length} insights</span></div>
            <div class="insights-list">
              ${insights.map(ins => `
                <div class="insight-item">
                  <div class="insight-icon" style="color:${ins.color}"><i class="${ins.icon}"></i></div>
                  <div class="insight-body">
                    <div class="insight-title">${ins.title}</div>
                    <div class="insight-desc">${ins.desc}</div>
                  </div>
                </div>`).join('')}
            </div>
          </div>`;
      }
    }
  },

  _statCard(iconClass, color, value, label) {
    const numVal = typeof value === 'number' ? value : parseInt(value);
    const isNum = !isNaN(numVal) && numVal > 0;
    return `<div class="stat-card">
      <div class="stat-icon ${color}"><i class="${iconClass}" style="font-size:20px"></i></div>
      <div><div class="stat-value${isNum ? ' counting' : ''}" ${isNum ? `data-target="${numVal}"` : ''}>${value}</div><div class="stat-label">${label}</div></div>
    </div>`;
  },

  _animateCountUps() {
    document.querySelectorAll('.stat-value.counting[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target);
      if (!target || target <= 0) return;
      const duration = 800;
      const start = performance.now();
      el.textContent = '0';
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(step);
        else { el.textContent = target; el.classList.remove('counting'); }
      };
      requestAnimationFrame(step);
    });
  },

  renderHeatmap(data) {
    const container = document.getElementById('heatmapContainer');
    this._heatmapMap = {};
    for (const d of data) this._heatmapMap[d.date] = d.problems_solved;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // Build month labels
    let monthHtml = '<div class="heatmap-months">';
    const mCursor = new Date(startDate);
    let lastMonth = -1;
    let weekIdx = 0;
    const monthPositions = [];
    while (mCursor <= today) {
      if (mCursor.getMonth() !== lastMonth) {
        monthPositions.push({ month: months[mCursor.getMonth()], week: weekIdx });
        lastMonth = mCursor.getMonth();
      }
      mCursor.setDate(mCursor.getDate() + 7);
      weekIdx++;
    }
    for (const mp of monthPositions) {
      monthHtml += `<span class="heatmap-month-label" style="grid-column:${mp.week + 1}">${mp.month}</span>`;
    }
    monthHtml += '</div>';

    // Day labels
    let dayHtml = '<div class="heatmap-day-labels">';
    for (let i = 0; i < 7; i++) {
      dayHtml += `<span class="heatmap-day-label">${i % 2 === 1 ? days[i].slice(0,3) : ''}</span>`;
    }
    dayHtml += '</div>';

    // Grid
    let gridHtml = '<div class="heatmap-grid">';
    const d = new Date(startDate);
    let currentStreak = 0, maxStreak = 0, activeDays = 0, tmpStreak = 0;
    while (d <= today) {
      gridHtml += '<div class="heatmap-week">';
      for (let dow = 0; dow < 7; dow++) {
        const ds = d.toISOString().slice(0, 10);
        const count = this._heatmapMap[ds] || 0;
        const level = count === 0 ? 0 : count <= 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
        const isFuture = d > today;
        if (count > 0) { activeDays++; tmpStreak++; if (tmpStreak > maxStreak) maxStreak = tmpStreak; }
        else { tmpStreak = 0; }
        gridHtml += `<div class="heatmap-cell${isFuture ? ' future' : ''}" data-level="${isFuture ? -1 : level}" data-date="${ds}" data-count="${count}" title="${ds}: ${count} solved" onclick="App._showHeatmapDetail('${ds}')"></div>`;
        d.setDate(d.getDate() + 1);
      }
      gridHtml += '</div>';
    }
    currentStreak = tmpStreak;
    gridHtml += '</div>';

    const total = data.reduce((s, d) => s + d.problems_solved, 0);

    container.innerHTML = `
      <div class="heatmap-wrapper">
        <div class="heatmap-stats-row">
          <div class="heatmap-stat"><span class="heatmap-stat-value">${total}</span><span class="heatmap-stat-label">Total Solved</span></div>
          <div class="heatmap-stat"><span class="heatmap-stat-value">${activeDays}</span><span class="heatmap-stat-label">Active Days</span></div>
          <div class="heatmap-stat"><span class="heatmap-stat-value">${currentStreak}</span><span class="heatmap-stat-label">Current Streak</span></div>
          <div class="heatmap-stat"><span class="heatmap-stat-value">${maxStreak}</span><span class="heatmap-stat-label">Best Streak</span></div>
        </div>
        ${monthHtml}
        <div class="heatmap-body">
          ${dayHtml}
          ${gridHtml}
        </div>
        <div class="heatmap-legend">Less <div class="heatmap-cell" data-level="0"></div><div class="heatmap-cell" data-level="1"></div><div class="heatmap-cell" data-level="2"></div><div class="heatmap-cell" data-level="3"></div><div class="heatmap-cell" data-level="4"></div> More</div>
      </div>
      <div class="heatmap-detail-panel hidden" id="heatmapDetailPanel"></div>`;

    document.getElementById('heatmapLabel').textContent = `${total} solved in the last year`;
  },

  _showHeatmapDetail(dateStr) {
    const panel = document.getElementById('heatmapDetailPanel');
    if (!panel) return;
    // Deselect previous
    document.querySelectorAll('.heatmap-cell.selected').forEach(c => c.classList.remove('selected'));
    // Select clicked
    const cell = document.querySelector(`.heatmap-cell[data-date="${dateStr}"]`);
    if (cell) cell.classList.add('selected');

    const count = this._heatmapMap?.[dateStr] || 0;
    const dateObj = new Date(dateStr + 'T00:00:00');
    const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="heatmap-detail-header">
        <div class="heatmap-detail-date">${formatted}</div>
        <div class="heatmap-detail-count">${count} problem${count !== 1 ? 's' : ''} solved</div>
        <button class="heatmap-detail-close" onclick="App._closeHeatmapDetail()">&times;</button>
      </div>
      <div class="heatmap-detail-body" id="heatmapDetailBody">
        ${count === 0 ? '<div class="heatmap-detail-empty">No problems solved on this day</div>' : '<div class="heatmap-detail-loading"><div class="spinner"></div>Loading submissions…</div>'}
      </div>`;

    if (count === 0) return;

    API.getDateActivity(dateStr).then(res => {
      const body = document.getElementById('heatmapDetailBody');
      if (!body) return;
      if (!res.ok || !res.submissions.length) {
        body.innerHTML = '<div class="heatmap-detail-empty">No submission details available</div>';
        return;
      }
      body.innerHTML = res.submissions.map(s => `
        <div class="heatmap-detail-item">
          <div class="heatmap-detail-verdict ${(s.verdict || '').toLowerCase()}">${s.verdict || '?'}</div>
          <div class="heatmap-detail-info">
            <div class="heatmap-detail-title">${this._esc(s.title || 'Unknown')}</div>
            <div class="heatmap-detail-meta">
              <span class="badge ${s.platform === 'codeforces' ? 'badge-cf' : 'badge-cc'}">${s.platform === 'codeforces' ? 'CF' : 'CC'}</span>
              ${this._ratingBadge(s.rating)}
              <span style="color:var(--text-muted)">${s.language || ''}</span>
              ${s.exec_time_ms ? `<span style="color:var(--text-muted)">${s.exec_time_ms}ms</span>` : ''}
            </div>
          </div>
        </div>`).join('');
    }).catch(() => {
      const body = document.getElementById('heatmapDetailBody');
      if (body) body.innerHTML = '<div class="heatmap-detail-empty">Failed to load details</div>';
    });
  },

  _closeHeatmapDetail() {
    const panel = document.getElementById('heatmapDetailPanel');
    if (panel) { panel.classList.add('hidden'); }
    document.querySelectorAll('.heatmap-cell.selected').forEach(c => c.classList.remove('selected'));
  },

  renderRatingChart(dist) {
    const ctx = document.getElementById('ratingChart');
    if (this.charts.rating) this.charts.rating.destroy();
    const colors = {
      'Newbie': '#808080', 'Pupil': '#22c55e', 'Specialist': '#14b8a6',
      'Expert': '#3b82f6', 'Candidate Master': '#059669', 'Master': '#f59e0b', 'Grandmaster': '#ef4444',
    };
    this.charts.rating = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: dist.map(d => d.tier),
        datasets: [{ data: dist.map(d => d.count), backgroundColor: dist.map(d => colors[d.tier] || '#666'), borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } } } },
    });
  },

  renderVerdictChart(verdicts) {
    const ctx = document.getElementById('verdictChart');
    if (this.charts.verdict) this.charts.verdict.destroy();
    const colors = { AC: '#22c55e', WA: '#ef4444', TLE: '#f59e0b', CE: '#94a3b8', RE: '#059669', OK: '#3b82f6' };
    this.charts.verdict = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: verdicts.map(v => v.verdict),
        datasets: [{ data: verdicts.map(v => v.count), backgroundColor: verdicts.map(v => colors[v.verdict] || '#666'), borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } } } },
    });
  },

  /* ===================================================
     PROBLEMS
     =================================================== */
  async renderProblems(el) {
    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-problems" style="font-size:28px"></i> <span class="glitch" data-text="Problems">Problems</span></h1>
        <p>grep -r "challenge" /codeforces /codechef --type=problem</p>
      </div>
      <div class="card">
        <div class="filter-bar">
          <input class="input search-input" id="searchInput" placeholder="Search problems..." oninput="App.debounceSearch()">
          <select class="input" id="platformFilter" onchange="App.filterProblems()">
            <option value="all">All Platforms</option>
            <option value="codeforces">Codeforces</option>
            <option value="codechef">CodeChef</option>
          </select>
          <select class="input" id="ratingFilterMin" onchange="App.filterProblems()">
            <option value="">Min Rating</option>
            <option value="0">0+</option><option value="800">800+</option>
            <option value="1000">1000+</option><option value="1200">1200+</option>
            <option value="1400">1400+</option><option value="1600">1600+</option>
            <option value="1800">1800+</option><option value="2000">2000+</option>
            <option value="2200">2200+</option><option value="2500">2500+</option>
          </select>
          <select class="input" id="ratingFilterMax" onchange="App.filterProblems()">
            <option value="">Max Rating</option>
            <option value="1000">\u22641000</option><option value="1200">\u22641200</option>
            <option value="1400">\u22641400</option><option value="1600">\u22641600</option>
            <option value="1800">\u22641800</option><option value="2000">\u22642000</option>
            <option value="2500">\u22642500</option><option value="3500">\u22643500</option>
          </select>
          <select class="input" id="statusFilter" onchange="App.filterProblems()">
            <option value="all">All Status</option>
            <option value="solved">Solved</option>
            <option value="attempted">Attempted</option>
            <option value="unsolved">Unsolved</option>
          </select>
        </div>
        <div id="problemsTable"></div>
        <div class="pagination">
          <div class="pagination-info" id="paginationInfo"></div>
          <div class="pagination-btns">
            <button class="btn btn-secondary btn-sm" onclick="App.prevPage()">\u2190 Previous</button>
            <button class="btn btn-secondary btn-sm" onclick="App.nextPage()">Next \u2192</button>
          </div>
        </div>
      </div>`;
    this.problemsState.offset = 0;
    this.loadProblems();
  },

  async loadProblems() {
    const s = this.problemsState;
    const searchVal = document.getElementById('searchInput')?.value || '';
    const platform = document.getElementById('platformFilter')?.value || 'all';
    const minR = document.getElementById('ratingFilterMin')?.value || '';
    const maxR = document.getElementById('ratingFilterMax')?.value || '';
    const status = document.getElementById('statusFilter')?.value || 'all';

    const params = { limit: s.limit, offset: s.offset, sort: s.sort, order: s.order };
    if (searchVal) params.search = searchVal;
    if (platform !== 'all') params.platform = platform;
    if (minR) params.minRating = minR;
    if (maxR) params.maxRating = maxR;
    if (status !== 'all') params.status = status;

    const data = await API.getProblems(params);
    if (!data.ok) return;
    s.total = data.total;

    const tbody = data.problems.map(p => `
      <tr onclick="App.openSolve(${p.id})">
        <td><span class="status-dot ${p.solve_status}"></span></td>
        <td><span class="badge ${p.platform === 'codeforces' ? 'badge-cf' : 'badge-cc'}" style="font-size:10px;padding:2px 6px">${p.platform === 'codeforces' ? 'CF' : 'CC'}</span></td>
        <td><span class="problem-title-link">${this._esc(p.title)}</span></td>
        <td>${this._ratingBadge(p.rating)}</td>
        <td class="text-sm text-muted">${p.problem_id}</td>
        <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();App.openSolve(${p.id})"><i class="icon-sword"></i> Solve</button></td>
      </tr>`).join('');

    document.getElementById('problemsTable').innerHTML = `
      <table class="problem-table">
        <thead><tr>
          <th style="width:32px"></th>
          <th style="width:50px">Src</th>
          <th onclick="App.toggleSort('title')">Title</th>
          <th onclick="App.toggleSort('rating')" style="width:100px">Difficulty</th>
          <th style="width:80px">ID</th>
          <th style="width:90px"></th>
        </tr></thead>
        <tbody>${tbody || '<tr><td colspan="6" class="text-center text-muted" style="padding:40px">// 0 records — run ./config to sync problem DB</td></tr>'}</tbody>
      </table>`;

    const start = s.offset + 1;
    const end = Math.min(s.offset + s.limit, s.total);
    document.getElementById('paginationInfo').textContent = s.total ? `${start}\u2013${end} of ${s.total}` : 'No results';
  },

  toggleSort(col) {
    const s = this.problemsState;
    if (s.sort === col) s.order = s.order === 'asc' ? 'desc' : 'asc';
    else { s.sort = col; s.order = 'asc'; }
    s.offset = 0;
    this.loadProblems();
  },
  nextPage() { const s = this.problemsState; if (s.offset + s.limit < s.total) { s.offset += s.limit; this.loadProblems(); } },
  prevPage() { const s = this.problemsState; if (s.offset > 0) { s.offset = Math.max(0, s.offset - s.limit); this.loadProblems(); } },
  filterProblems() { this.problemsState.offset = 0; this.loadProblems(); },
  _searchTimer: null,
  debounceSearch() { clearTimeout(this._searchTimer); this._searchTimer = setTimeout(() => this.filterProblems(), 300); },

  /* ===================================================
     CONTESTS
     =================================================== */
  async renderContests(el) {
    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-contests" style="font-size:28px"></i> <span class="glitch" data-text="Contests">Contests</span></h1>
        <p>crontab -l | grep 'contest' # live + upcoming arenas</p>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="App.filterContests('all',this)">*</button>
        <button class="tab" onclick="App.filterContests('running',this)">● live</button>
        <button class="tab" onclick="App.filterContests('upcoming',this)">▶ queue</button>
        <button class="tab" onclick="App.filterContests('finished',this)">✔ past</button>
      </div>
      <div class="contests-grid" id="contestsGrid"><div class="loader"><div class="loader-ring"></div><div class="loader-dots"><span></span><span></span><span></span></div></div></div>`;

    this._contestsData = (await API.getContests()).contests || [];
    this.filterContests('all');
  },

  _contestsData: [],
  filterContests(filter, tabEl) {
    if (tabEl) {
      tabEl.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tabEl.classList.add('active');
    }
    let contests = this._contestsData;
    if (filter === 'running') contests = contests.filter(c => c.phase === 'RUNNING' || c.phase === 'CODING');
    else if (filter === 'upcoming') contests = contests.filter(c => c.phase === 'BEFORE' || c.phase === 'PENDING');
    else if (filter === 'finished') contests = contests.filter(c => c.phase === 'FINISHED');

    const grid = document.getElementById('contestsGrid');
    if (!contests.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="icon-trophy" style="font-size:40px"></i></div><h3>// no live arenas found</h3><p>Retry later — servers update every 30min</p></div>';
      return;
    }
    grid.innerHTML = contests.map(c => {
      const isRunning = c.phase === 'RUNNING' || c.phase === 'CODING';
      const isUpcoming = c.phase === 'BEFORE' || c.phase === 'PENDING';
      const statusClass = isRunning ? 'running' : isUpcoming ? 'upcoming' : '';
      const statusBadge = isRunning ? '<span class="contest-status status-running"><span class="live-dot"></span> LIVE</span>'
        : isUpcoming ? '<span class="contest-status status-upcoming">Upcoming</span>'
        : '<span class="contest-status status-finished">Finished</span>';
      const timeStr = c.startTime ? new Date(c.startTime).toLocaleString() : '\u2014';
      const durStr = c.durationSeconds ? `${Math.round(c.durationSeconds / 3600)}h` : '\u2014';
      return `
        <div class="contest-card ${statusClass}">
          <div class="contest-header">
            <span class="badge ${c.platform === 'codeforces' ? 'badge-cf' : 'badge-cc'}" style="font-size:10px">${c.platform === 'codeforces' ? 'CF' : 'CC'}</span>
            ${statusBadge}
          </div>
          <div class="contest-name">${this._esc(c.name)}</div>
          <div class="contest-details mt-2">
            <div class="contest-detail"><i class="icon-calendar" style="font-size:13px"></i> ${timeStr}</div>
            <div class="contest-detail"><i class="icon-clock" style="font-size:13px"></i> Duration: ${durStr}</div>
          </div>
          <a href="${this._esc(c.url)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm mt-3 full-width">Open Contest \u2192</a>
        </div>`;
    }).join('');
  },

  /* ===================================================
     PROFILE
     =================================================== */
  async renderProfile(el) {
    el.innerHTML = `
      <div class="profile-header" id="profileHeader">
        <div class="profile-avatar"><img src="/nexora-logo.svg" alt="Nexora" style="width:80px;height:80px;object-fit:contain"></div>
        <div class="profile-info">
          <h2>Profile</h2>
          <p>user.getStats() => rank + achievements</p>
          <div class="profile-handles mt-3">
            <button class="btn btn-ghost btn-sm" onclick="App.openSettings()"><i class="icon-settings" style="font-size:13px"></i> Open Settings</button>
            <button class="btn btn-secondary btn-sm" onclick="App.syncSolvedProblems()"><i class="icon-sync" style="font-size:13px"></i> Sync Solved</button>
          </div>
        </div>
      </div>
      <div class="card mb-3" id="rankProgressionCard">
        <div class="card-header"><span class="card-title"><i class="icon-medal" style="font-size:16px"></i> Rank Progression</span></div>
        <div class="rank-progression" id="rankProgression"></div>
      </div>
      <div class="card mb-3">
        <div class="card-header"><span class="card-title"><i class="icon-trophy" style="font-size:16px"></i> Achievements</span>
          <span class="badge badge-xp" id="achieveCountBadge">0/0</span></div>
        <div class="achievements-grid" id="achievementsGrid"></div>
      </div>
      <div class="profile-grid">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="icon-chart" style="font-size:16px"></i> Platform Distribution</span></div>
          <div class="chart-container"><canvas id="platformChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="icon-star" style="font-size:16px"></i> Statistics</span></div>
          <div id="solveStats"></div>
        </div>
      </div>`;

    const [stats, settings] = await Promise.all([API.getStats(), API.getSettings()]);

    if (!stats.ok) return;

    // ---- Rift Progression ----
    if (stats.allTitles?.length) {
      const rpEl = document.getElementById('rankProgression');
      let rpHtml = '';
      const currentLvl = stats.level.level;
      for (let i = 0; i < stats.allTitles.length; i++) {
        const t = stats.allTitles[i];
        const lvlNum = i + 1;
        const reached = currentLvl >= lvlNum;
        const isCurrent = currentLvl === lvlNum;
        rpHtml += `
          <div class="rank-node ${isCurrent ? 'rank-current' : ''}">
            <div class="rank-dot ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}" style="background:${t.color}${reached ? '' : ';opacity:0.3'};${reached && t.glow !== 'none' ? 'box-shadow:' + t.glow : ''}">
              <span class="rank-badge">${t.badge || ''}</span>
            </div>
            <div class="rank-name" style="color:${t.color}">${lvlNum}. ${t.title}</div>
            <div class="rank-xp">${t.min_xp.toLocaleString()} XP · ${(t.min_problems||0).toLocaleString()} solved</div>
          </div>`;
        if (i < stats.allTitles.length - 1) {
          rpHtml += `<div class="rank-connector ${reached ? 'reached' : ''}"></div>`;
        }
      }
      rpEl.innerHTML = rpHtml;
    }

    // ---- Achievements ----
    const unlocked = stats.achievements.filter(a => a.unlocked_at).length;
    document.getElementById('achieveCountBadge').textContent = `${unlocked}/${stats.achievements.length}`;

    const achvGrid = document.getElementById('achievementsGrid');
    achvGrid.innerHTML = stats.achievements.map(a => {
      const isUnlocked = !!a.unlocked_at;
      const pct = Math.min(100, Math.round(a.progress / a.target * 100));
      const icon = this._achieveIconMap[a.icon] || '<i class="icon-medal"></i>';
      return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon-wrap">${icon}</div>
          <div class="achievement-title">${a.title}</div>
          <div class="achievement-desc">${a.description}</div>
          <div class="achievement-xp-reward">+${a.xp_reward || 0} XP</div>
          <div class="achievement-progress"><div class="achievement-progress-fill" style="width:${pct}%"></div></div>
          <div class="text-sm text-muted mt-2">${a.progress}/${a.target}</div>
        </div>`;
    }).join('');

    // ---- Platform Chart ----
    if (stats.platformDist.length) {
      const ctx = document.getElementById('platformChart');
      if (this.charts.platform) this.charts.platform.destroy();
      this.charts.platform = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: stats.platformDist.map(d => d.platform === 'codeforces' ? 'Codeforces' : 'CodeChef'),
          datasets: [{ data: stats.platformDist.map(d => d.count), backgroundColor: ['#fcd34d', '#a78bfa'], borderWidth: 0 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } },
      });
    }

    // ---- Battle Stats ----
    document.getElementById('solveStats').innerHTML = `
      <div style="display:grid;gap:12px;padding:12px 0">
        <div class="flex items-center gap-3">
          <span class="stat-icon green" style="width:36px;height:36px"><i class="icon-check" style="font-size:16px"></i></span>
          <div><div style="font-size:18px;font-weight:700">${stats.solved}</div><div class="text-sm text-muted">Problems Solved</div></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="stat-icon amber" style="width:36px;height:36px"><i class="icon-target" style="font-size:16px"></i></span>
          <div><div style="font-size:18px;font-weight:700">${stats.accuracy}%</div><div class="text-sm text-muted">Accuracy</div></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="stat-icon purple" style="width:36px;height:36px"><i class="icon-bolt" style="font-size:16px"></i></span>
          <div><div style="font-size:18px;font-weight:700">${stats.totalXp}</div><div class="text-sm text-muted">Total XP</div></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="stat-icon blue" style="width:36px;height:36px"><i class="icon-fire" style="font-size:16px"></i></span>
          <div><div style="font-size:18px;font-weight:700">${stats.streak.current}</div><div class="text-sm text-muted">Day Streak (Best: ${stats.streak.best})</div></div>
        </div>
      </div>`;
  },

  async syncSolvedProblems() {
    this.toast('[sync] fetching solved data...', 'info');
    const res = await API.syncSolved();
    if (res.ok) this.toast(`[sync] merged ${res.synced} solved entries`, 'success');
    else this.toast('[error] sync failed: ' + (res.error || 'unknown'), 'error');
  },

  /* ===================================================
     NEXUS — Unified Progression Tree (Campaign + Skills merged)
     =================================================== */
  _nexusData: null,

  async renderNexus(el) {
    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-arena" style="font-size:28px"></i> <span class="glitch" data-text="Progress">Progress</span></h1>
        <p>cat /var/log/stats.log | sort -k2 -rn # rank + zones + XP</p>
        <button class="tab active" onclick="App._switchNexusView('zones',this)"><i class="icon-arena"></i> /zones</button>
        <button class="tab" onclick="App._switchNexusView('performance',this)"><i class="icon-chart"></i> /perf</button>
      </div>
      <div id="nexusZones"></div>
      <div id="nexusPerformance" class="hidden"></div>`;

    this._loadNexusZones();
  },

  _switchNexusView(view, btn) {
    if (btn) btn.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('nexusZones').classList.toggle('hidden', view !== 'zones');
    document.getElementById('nexusPerformance').classList.toggle('hidden', view !== 'performance');
    if (view === 'performance' && !this._perfLoaded) this._loadPerformance();
  },

  async _loadNexusZones() {
    const el = document.getElementById('nexusZones');
    el.innerHTML = '<div class="loader"><div class="loader-ring"></div><div class="loader-dots"><span></span><span></span><span></span></div><p class="loader-text">Loading Zones...</p></div>';

    const [data, roadmap] = await Promise.all([API.getNexus(), API.getLevelRoadmap()]);
    if (!data.ok) { el.innerHTML = '<div class="empty-state"><p>// error: failed to fetch data</p></div>'; return; }
    this._nexusData = data;

    const roadmapByLevel = {};
    if (roadmap.ok) {
      for (const lv of roadmap.levels) roadmapByLevel[lv.level] = lv;
    }

    // Player Status bar
    const p = data.player;
    let html = `
      <div class="nexus-player-bar card mt-3">
        <div class="nexus-player-info">
          <div class="hud-level-badge" style="background:${p.color};${p.glow !== 'none' ? 'box-shadow:' + p.glow : ''}">${p.level}</div>
          <div>
            <div class="nexus-player-name" style="color:${p.color}">${this._esc(p.name)}</div>
            <div class="text-sm text-muted">${p.xp.toLocaleString()} XP · Zone ${p.level}/${data.zones.length}</div>
          </div>
        </div>
        <div class="lrm-refresh">
          <span class="text-sm text-muted"><i class="icon-clock" style="font-size:11px"></i> Problems refresh weekly</span>
        </div>
      </div>`;

    // Zones with skill nodes + practice problems
    html += '<div class="nexus-zones-list">';
    const riftBadges = {};
    if (data.riftLevels) data.riftLevels.forEach(r => riftBadges[r.level] = r.badge);
    for (const zone of data.zones) {
      const zoneNodes = data.nodes.filter(n => n.zone === zone.level);
      const rm = roadmapByLevel[zone.level];
      const state = zone.completed ? 'completed' : zone.current ? 'current' : zone.unlocked ? 'unlocked' : 'locked';
      const nodeColor = zone.color;
      const totalProbs = rm ? rm.totalProblems : 0;
      const solvedProbs = rm ? rm.solvedCount : 0;
      const badge = riftBadges[zone.level] || zone.level;

      html += `
        <div class="nexus-zone ${state}">
          <div class="nexus-zone-header" onclick="this.parentElement.classList.toggle('expanded')">
            <div class="nexus-zone-icon" style="${state !== 'locked' ? 'border-color:' + nodeColor + ';color:' + nodeColor : ''}">
              ${zone.completed ? '<i class="icon-check" style="font-size:18px"></i>' : state === 'locked' ? '<i class="icon-lock" style="font-size:16px"></i>' : '<span class="zone-badge-icon">' + badge + '</span>'}
            </div>
            <div class="nexus-zone-info">
              <div class="nexus-zone-title" style="color:${nodeColor}">
                Zone ${zone.level}: ${this._esc(zone.name)}
                ${zone.current ? '<span class="lrm-current-badge">CURRENT</span>' : ''}
              </div>
              <div class="nexus-zone-sub">Rating ${zone.minR}–${zone.maxR} · ${zone.nodesCompleted}/${zone.nodeCount} skills · ${solvedProbs}/${totalProbs} problems</div>
              <div class="nexus-zone-progress-bar"><div class="nexus-zone-progress-fill" style="width:${zone.zoneProgress}%;background:${nodeColor}"></div></div>
            </div>
            <div class="nexus-zone-stats">
              <span class="nexus-zone-count">${zone.zoneProgress}%</span>
              <i class="icon-chevron-down nexus-zone-chevron"></i>
            </div>
          </div>`;

      if (state !== 'locked') {
        html += '<div class="nexus-zone-nodes">';

        // Skill nodes section
        if (zoneNodes.length) {
          html += '<div class="nz-section-label"><i class="icon-tree" style="font-size:12px"></i> Skill Nodes</div>';
          html += zoneNodes.map(n => {
            const nState = n.completed ? 'completed' : n.unlocked ? (n.progress > 0 ? 'in-progress' : 'unlocked') : 'locked';
            return `
            <div class="nexus-skill ${nState}" onclick="App._openNexusNode('${n.id}')">
              <div class="nexus-skill-icon">${n.icon}</div>
              <div class="nexus-skill-body">
                <div class="nexus-skill-name">${this._esc(n.name)}</div>
                <div class="nexus-skill-desc text-sm text-muted">${this._esc(n.desc || '')}</div>
                <div class="nexus-skill-bar"><div class="nexus-skill-fill" style="width:${n.progress}%;background:${nodeColor}"></div></div>
                <div class="nexus-skill-meta text-sm">${n.solved}/${n.target} · ${n.progress}%${n.completed ? ' <i class="icon-check" style="color:var(--success);font-size:11px"></i>' : ''}</div>
              </div>
            </div>`;
          }).join('');
        }

        // Practice problems section (from level roadmap)
        if (rm && rm.topics.length) {
          html += '<div class="nz-section-label" style="margin-top:12px"><i class="icon-path" style="font-size:12px"></i> Practice Problems</div>';
          for (const topic of rm.topics) {
            const topicSolved = topic.problems.filter(tp => tp.solve_status === 'solved').length;
            const topicTotal = topic.problems.length;
            const topicPct = topicTotal ? Math.round(topicSolved / topicTotal * 100) : 0;

            html += `
            <div class="lrm-topic">
              <div class="lrm-topic-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="lrm-topic-info">
                  <span class="lrm-topic-name">${this._esc(topic.name)}</span>
                  <span class="lrm-topic-desc">${this._esc(topic.desc)}</span>
                </div>
                <div class="lrm-topic-right">
                  <span class="lrm-topic-pool text-sm text-muted">${topic.solvedInPool}/${topic.totalPool} in pool</span>
                  <span class="lrm-topic-count ${topicPct === 100 ? 'done' : ''}">${topicSolved}/${topicTotal}</span>
                  <i class="icon-chevron-down lrm-topic-chevron"></i>
                </div>
              </div>
              <div class="lrm-topic-problems">`;

            if (topic.problems.length === 0) {
              html += '<div class="lrm-empty">No problems available — sync more from Problems page</div>';
            } else {
              for (const prob of topic.problems) {
                const solved = prob.solve_status === 'solved';
                const attempted = prob.solve_status === 'attempted';
                html += `
                <div class="lrm-problem ${solved ? 'solved' : attempted ? 'attempted' : ''}" onclick="App.openSolve(${prob.id})">
                  <div class="lrm-problem-status">
                    ${solved ? '<i class="icon-check" style="font-size:12px;color:var(--success)"></i>' : attempted ? '<i class="icon-clock" style="font-size:12px;color:var(--warning)"></i>' : '<span class="lrm-problem-dot"></span>'}
                  </div>
                  <div class="lrm-problem-info">
                    <span class="lrm-problem-title">${this._esc(prob.title)}</span>
                    <span class="lrm-problem-id">${this._esc(prob.problem_id || '')}</span>
                  </div>
                  <span class="lrm-problem-rating ${this._ratingClass(prob.rating)}">${prob.rating || '?'}</span>
                  <span class="badge ${prob.platform === 'codeforces' ? 'badge-cf' : prob.platform === 'codechef' ? 'badge-cc' : 'badge-at'}" style="font-size:9px">${prob.platform === 'codeforces' ? 'CF' : prob.platform === 'codechef' ? 'CC' : 'AT'}</span>
                  ${prob.attempts > 0 && !solved ? '<span class="lrm-attempts text-sm text-muted">' + prob.attempts + ' tries</span>' : ''}
                </div>`;
              }
            }
            html += '</div></div>';
          }
        }

        html += '</div>';
      } else {
        html += '<div class="nexus-zone-locked text-sm text-muted"><i class="icon-lock" style="font-size:12px"></i> Reach Level ' + zone.level + ' (' + zone.xpRequired.toLocaleString() + ' XP &amp; ' + zone.probsRequired.toLocaleString() + ' problems) to unlock</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;

    // Auto-expand current zone
    const currentZone = el.querySelector('.nexus-zone.current');
    if (currentZone) {
      currentZone.classList.add('expanded');
      const firstTopic = currentZone.querySelector('.lrm-topic');
      if (firstTopic) firstTopic.classList.add('expanded');
    }
  },

  /* ===== Performance Analytics ===== */
  _perfLoaded: false,
  async _loadPerformance() {
    const el = document.getElementById('nexusPerformance');
    el.innerHTML = '<div class="loader"><div class="loader-ring"></div><div class="loader-dots"><span></span><span></span><span></span></div><p class="loader-text">Crunching your data...</p></div>';

    const d = await API.getPerformance();
    if (!d.ok) { el.innerHTML = '<div class="empty-state"><p>// error: analytics module failed</p></div>'; return; }
    this._perfLoaded = true;

    let html = '';

    /* ═══════════════════════════════════════════════
       1. HERO STATS — overview cards with live pulse
       ═══════════════════════════════════════════════ */
    const lvl = d.level || {};
    const nextLvl = d.nextLevel;
    const xpPct = lvl.xpForNext > 0 ? Math.min(Math.round(lvl.xpInLevel / lvl.xpForNext * 100), 100) : 100;
    const probPct = lvl.probsForNext > 0 ? Math.min(Math.round(lvl.probsInLevel / lvl.probsForNext * 100), 100) : 100;

    html += `<div class="perf-hero mt-3">
      <div class="perf-hero-rank">
        <div class="perf-hero-ring" style="--pct:${xpPct};--ring-color:${lvl.color || 'var(--accent)'}">
          <div class="perf-hero-ring-inner">
            <span class="perf-hero-lvl" style="color:${lvl.color || 'var(--accent)'}">${lvl.level || 1}</span>
            <span class="perf-hero-title">${this._esc(lvl.name || 'Bit')}</span>
          </div>
        </div>
        ${nextLvl ? `<div class="perf-hero-next">
          <div class="perf-hero-next-label">Next: <span style="color:${nextLvl.color}">${this._esc(nextLvl.name)}</span></div>
          <div class="perf-hero-gates">
            <div class="perf-gate ${lvl.xpGated ? '' : 'done'}"><div class="perf-gate-fill" style="width:${xpPct}%;background:${lvl.color || 'var(--accent)'}"></div><span>${d.totalXp?.toLocaleString()}/${nextLvl.xpNeeded?.toLocaleString()} XP</span></div>
            <div class="perf-gate ${lvl.probGated ? '' : 'done'}"><div class="perf-gate-fill" style="width:${probPct}%;background:${lvl.color || 'var(--accent)'}"></div><span>${d.solved}/${nextLvl.probsNeeded} Problems</span></div>
          </div>
          ${nextLvl.daysEstimate != null ? `<div class="perf-hero-eta"><i class="icon-clock" style="font-size:11px"></i> ~${nextLvl.daysEstimate} day${nextLvl.daysEstimate !== 1 ? 's' : ''} at current pace</div>` : ''}
        </div>` : '<div class="perf-hero-next"><div class="perf-hero-eta" style="color:var(--warning)">MAX LEVEL REACHED</div></div>'}
      </div>
    </div>`;

    // Stat cards row
    html += `<div class="perf-overview mt-3">
      <div class="perf-card"><div class="perf-card-icon" style="background:var(--success-bg);color:var(--success)"><i class="icon-check"></i></div><div class="perf-card-val">${d.solved}</div><div class="perf-card-label">Solved</div></div>
      <div class="perf-card"><div class="perf-card-icon" style="background:rgba(59,130,246,0.1);color:var(--info)"><i class="icon-code"></i></div><div class="perf-card-val">${d.submissions}</div><div class="perf-card-label">Submissions</div></div>
      <div class="perf-card"><div class="perf-card-icon" style="background:rgba(5,150,105,0.1);color:var(--purple)"><i class="icon-target"></i></div><div class="perf-card-val">${d.accuracy}%</div><div class="perf-card-label">Accuracy</div></div>
      <div class="perf-card"><div class="perf-card-icon" style="background:var(--warning-bg);color:var(--warning)"><i class="icon-bolt"></i></div><div class="perf-card-val">${d.totalXp?.toLocaleString() || 0}</div><div class="perf-card-label">Total XP</div></div>
      <div class="perf-card"><div class="perf-card-icon" style="background:rgba(212,160,23,0.1);color:#d4a017"><i class="icon-fire"></i></div><div class="perf-card-val">${d.streak?.current || 0}<span class="perf-card-sub">/ ${d.streak?.best || 0}</span></div><div class="perf-card-label">Day Streak</div></div>
      <div class="perf-card"><div class="perf-card-icon" style="background:rgba(20,184,166,0.1);color:#14b8a6"><i class="icon-trending"></i></div><div class="perf-card-val">${d.consistencyScore}%</div><div class="perf-card-label">Consistency</div></div>
    </div>`;

    /* ═══════════════════════════════════════════════
       2. RATING CLIMB — SVG line chart of difficulty over time
       ═══════════════════════════════════════════════ */
    const climb = d.ratingClimb || [];
    if (climb.length >= 2) {
      const climbW = 700, climbH = 160, padX = 40, padY = 20;
      const minR = Math.min(...climb.map(c => c.rating));
      const maxR = Math.max(...climb.map(c => c.rating));
      const rRange = Math.max(maxR - minR, 100);
      const pts = climb.map((c, i) => {
        const x = padX + (i / (climb.length - 1)) * (climbW - 2 * padX);
        const y = padY + (1 - (c.rating - minR) / rRange) * (climbH - 2 * padY);
        return { x, y, r: c.rating, d: c.date };
      });
      const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const area = line + ` L ${pts[pts.length-1].x.toFixed(1)} ${climbH} L ${pts[0].x.toFixed(1)} ${climbH} Z`;

      // Running max (personal best line)
      let runMax = 0;
      const maxPts = pts.map(p => { runMax = Math.max(runMax, p.r || 0); const y2 = padY + (1 - (runMax - minR) / rRange) * (climbH - 2 * padY); return { x: p.x, y: y2 }; });
      const maxLine = maxPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-trending" style="font-size:14px"></i> rating.climb() — difficulty progression</div>
        <div class="perf-chart-scroll">
        <svg class="perf-climb-svg" viewBox="0 0 ${climbW} ${climbH}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="climbGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${[0, 0.25, 0.5, 0.75, 1].map(f => {
            const y = padY + f * (climbH - 2 * padY);
            const val = Math.round(maxR - f * rRange);
            return `<line x1="${padX}" y1="${y}" x2="${climbW - padX}" y2="${y}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="4 3"/>
              <text x="${padX - 4}" y="${y + 3}" text-anchor="end" fill="var(--text-muted)" font-size="9" font-family="JetBrains Mono,monospace">${val}</text>`;
          }).join('')}
          <path d="${area}" fill="url(#climbGrad)"/>
          <path d="${maxLine}" fill="none" stroke="var(--warning)" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.6"/>
          <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/>
          <circle cx="${pts[pts.length-1].x}" cy="${pts[pts.length-1].y}" r="4" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>
        </svg>
        </div>
        <div class="perf-climb-legend"><span><span class="perf-dot" style="background:var(--accent)"></span> Solved Rating</span><span><span class="perf-dot" style="background:var(--warning)"></span> Peak (Personal Best)</span><span class="text-sm text-muted">${climb.length} problems plotted</span></div>
      </div>`;
    }

    /* ═══════════════════════════════════════════════
       3. DUAL CHARTS — Verdicts + Rating Distribution side by side
       ═══════════════════════════════════════════════ */
    html += '<div class="perf-dual mt-3">';

    // 3a. Verdict donut
    const verdicts = d.verdicts || [];
    const totalV = verdicts.reduce((s, v) => s + v.count, 0) || 1;
    const verdictColors = { AC: '#10b981', WA: '#ef4444', TLE: '#f59e0b', RE: '#f97316', CE: '#059669', MLE: '#d4a017' };
    let donutOffset = 0;
    const donutR = 60, donutC = 2 * Math.PI * donutR;
    html += `<div class="perf-section" style="flex:1">
      <div class="perf-section-header"><i class="icon-chart" style="font-size:14px"></i> verdict.breakdown()</div>
      <div class="perf-donut-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="${donutR}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="18"/>`;
    for (const v of verdicts) {
      const pct = v.count / totalV;
      const dash = pct * donutC;
      const col = verdictColors[v.verdict] || '#6b7280';
      html += `<circle cx="80" cy="80" r="${donutR}" fill="none" stroke="${col}" stroke-width="18"
        stroke-dasharray="${dash.toFixed(1)} ${(donutC - dash).toFixed(1)}"
        stroke-dashoffset="${(-donutOffset).toFixed(1)}" transform="rotate(-90 80 80)"
        style="transition:stroke-dashoffset 0.6s"/>`;
      donutOffset += dash;
    }
    html += `<text x="80" y="74" text-anchor="middle" fill="var(--text-bright)" font-size="22" font-weight="800">${d.accuracy}%</text>
      <text x="80" y="92" text-anchor="middle" fill="var(--text-muted)" font-size="10" font-weight="600">ACCURACY</text>
    </svg>
    <div class="perf-donut-legend">`;
    for (const v of verdicts) {
      const pct = Math.round(v.count / totalV * 100);
      html += `<div class="perf-donut-item"><span class="perf-dot" style="background:${verdictColors[v.verdict] || '#6b7280'}"></span>${v.verdict} <span class="text-muted">${pct}% (${v.count})</span></div>`;
    }
    html += '</div></div></div>';

    // 3b. Rating bars
    const ratingDist = d.ratingDist || [];
    const maxRD = Math.max(...ratingDist.map(r => r.count), 1);
    const tierColors = { Newbie: '#6b7280', Pupil: '#22c55e', Specialist: '#14b8a6', Expert: '#3b82f6', 'Candidate Master': '#059669', Master: '#f59e0b', Grandmaster: '#ef4444' };
    html += `<div class="perf-section" style="flex:1">
      <div class="perf-section-header"><i class="icon-arena" style="font-size:14px"></i> Rating Breakdown</div>
      <div class="perf-rating-bars">`;
    for (const r of ratingDist) {
      const pct = Math.round(r.count / maxRD * 100);
      const col = tierColors[r.tier] || 'var(--accent)';
      html += `<div class="perf-rbar"><span class="perf-rbar-label" style="color:${col}">${this._esc(r.tier)}</span><div class="perf-rbar-track"><div class="perf-rbar-fill" style="width:${pct}%;background:${col}"></div></div><span class="perf-rbar-count">${r.count}</span></div>`;
    }
    html += '</div></div>';
    html += '</div>'; // end dual

    /* ═══════════════════════════════════════════════
       4. SOLVE EFFICIENCY — attempts & time per rating bracket
       ═══════════════════════════════════════════════ */
    const solveSpeed = d.solveSpeed || [];
    if (solveSpeed.length) {
      const maxAttempts = Math.max(...solveSpeed.map(s => s.avgAttempts || 0), 1);
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-bolt" style="font-size:14px"></i> Solve Efficiency by Rating</div>
        <div class="perf-efficiency">`;
      for (const s of solveSpeed) {
        const pct = Math.round((s.avgAttempts / maxAttempts) * 100);
        const effColor = s.avgAttempts <= 1.5 ? 'var(--success)' : s.avgAttempts <= 3 ? 'var(--warning)' : 'var(--danger)';
        html += `<div class="perf-eff-row">
          <span class="perf-eff-bracket">${s.bracket}</span>
          <div class="perf-eff-bar-wrap">
            <div class="perf-eff-bar" style="width:${pct}%;background:${effColor}"></div>
          </div>
          <div class="perf-eff-stats">
            <span style="color:${effColor}">${s.avgAttempts} avg</span>
            <span class="text-muted">${s.count} solved</span>
            ${s.avgMinutes > 0 ? `<span class="text-muted">${s.avgMinutes}m avg</span>` : ''}
          </div>
        </div>`;
      }
      html += '</div></div>';
    }

    /* ═══════════════════════════════════════════════
       5. WEEKLY MOMENTUM — bar chart of last 12 weeks
       ═══════════════════════════════════════════════ */
    const weekly = d.weeklyProgress || [];
    if (weekly.length) {
      const maxW = Math.max(...weekly.map(w => w.solved), 1);
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-calendar" style="font-size:14px"></i> Weekly Momentum (12 Weeks)</div>
        <div class="perf-weekly">`;
      for (const w of weekly) {
        const h = Math.max(Math.round(w.solved / maxW * 100), 4);
        const weekNum = w.week.split('W')[1] || '?';
        html += `<div class="perf-weekly-col" title="Week ${weekNum}: ${w.solved} solved, ${w.xp} XP, ${w.activeDays}/7 active days">
          <div class="perf-weekly-bar" style="height:${h}%"><span class="perf-weekly-val">${w.solved}</span></div>
          <div class="perf-weekly-label">W${weekNum}</div>
        </div>`;
      }
      html += '</div></div>';
    }

    /* ═══════════════════════════════════════════════
       6. ACTIVITY HEATMAP — GitHub-style 365-day grid
       ═══════════════════════════════════════════════ */
    const heatmap = d.heatmap || [];
    if (heatmap.length) {
      // Build a full 365-day map
      const heatObj = {};
      for (const h of heatmap) heatObj[h.date] = h.problems_solved;
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sun
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 364 - dayOfWeek);
      const weeks = [];
      let curWeek = [];
      for (let i = 0; i < 371; i++) {
        const dd = new Date(startDate);
        dd.setDate(dd.getDate() + i);
        if (dd > today) break;
        const ds = dd.toISOString().slice(0, 10);
        curWeek.push({ date: ds, count: heatObj[ds] || 0, dow: dd.getDay() });
        if (dd.getDay() === 6 || dd > today) { weeks.push(curWeek); curWeek = []; }
      }
      if (curWeek.length) weeks.push(curWeek);

      const maxHeat = Math.max(...heatmap.map(h => h.problems_solved), 1);
      const heatLevels = [0, Math.ceil(maxHeat * 0.25), Math.ceil(maxHeat * 0.5), Math.ceil(maxHeat * 0.75), maxHeat];
      const heatColors = ['rgba(255,255,255,0.04)', 'rgba(29,78,216,0.25)', 'rgba(29,78,216,0.45)', 'rgba(29,78,216,0.7)', 'var(--accent)'];
      const getHeatColor = (c) => { if (c === 0) return heatColors[0]; if (c <= heatLevels[1]) return heatColors[1]; if (c <= heatLevels[2]) return heatColors[2]; if (c <= heatLevels[3]) return heatColors[3]; return heatColors[4]; };

      const totalSolfvedDays = heatmap.filter(h => h.problems_solved > 0).length;
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-fire" style="font-size:14px"></i> Activity Heatmap <span class="text-sm text-muted" style="font-weight:500;text-transform:none;letter-spacing:0"> — ${totalSolfvedDays} active days in the last year</span></div>
        <div class="perf-heatmap-scroll">
        <div class="perf-heatmap">
          <div class="perf-heatmap-labels"><span>Mon</span><span>Wed</span><span>Fri</span></div>
          <div class="perf-heatmap-grid">`;
      for (const week of weeks) {
        html += '<div class="perf-heatmap-col">';
        // Pad first week
        if (week === weeks[0]) { for (let p = 0; p < week[0]?.dow; p++) html += '<div class="perf-heatmap-cell empty"></div>'; }
        for (const day of week) {
          html += `<div class="perf-heatmap-cell" style="background:${getHeatColor(day.count)}" title="${day.date}: ${day.count} solved"></div>`;
        }
        html += '</div>';
      }
      html += `</div></div></div>
        <div class="perf-heatmap-legend"><span class="text-sm text-muted">Less</span>${heatColors.map(c => `<div class="perf-heatmap-cell" style="background:${c}"></div>`).join('')}<span class="text-sm text-muted">More</span></div>
      </div>`;
    }

    /* ═══════════════════════════════════════════════
       7. PEAK HOURS — when you code best (clock heatmap)
       ═══════════════════════════════════════════════ */
    const hours = d.hourDist || [];
    if (hours.length) {
      const maxHr = Math.max(...hours.map(h => h.total), 1);
      const peakHr = hours.reduce((best, h) => h.ac > (best?.ac || 0) ? h : best, null);
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-clock" style="font-size:14px"></i> Peak Coding Hours <span class="text-sm text-muted" style="font-weight:500;text-transform:none;letter-spacing:0">— best at ${peakHr ? (peakHr.hour > 12 ? (peakHr.hour - 12) + ' PM' : peakHr.hour + ' AM') : '?'}</span></div>
        <div class="perf-hours">`;
      for (let h = 0; h < 24; h++) {
        const entry = hours.find(x => x.hour === h) || { total: 0, ac: 0 };
        const intensity = entry.total / maxHr;
        const acRate = entry.total > 0 ? Math.round(entry.ac / entry.total * 100) : 0;
        const color = intensity > 0.7 ? 'var(--accent)' : intensity > 0.4 ? 'rgba(29,78,216,0.6)' : intensity > 0 ? 'rgba(29,78,216,0.25)' : 'rgba(255,255,255,0.04)';
        const label = h === 0 ? '12a' : h < 12 ? h + 'a' : h === 12 ? '12p' : (h-12) + 'p';
        html += `<div class="perf-hour" title="${label}: ${entry.total} submissions, ${acRate}% AC">
          <div class="perf-hour-bar" style="height:${Math.max(intensity * 100, 4)}%;background:${color}"></div>
          <span class="perf-hour-label">${h % 3 === 0 ? label : ''}</span>
        </div>`;
      }
      html += '</div></div>';
    }

    /* ═══════════════════════════════════════════════
       8. LANGUAGE ARSENAL — pie + efficiency per language
       ═══════════════════════════════════════════════ */
    const langs = d.langUsage || [];
    if (langs.length) {
      const totalLang = langs.reduce((s, l) => s + l.count, 0) || 1;
      const langColors = { cpp: '#00599C', python: '#3776AB', java: '#f89820', javascript: '#f7df1e', c: '#555555', rust: '#ce412b', go: '#00ADD8', kotlin: '#7F52FF' };
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-code" style="font-size:14px"></i> Language Arsenal</div>
        <div class="perf-langs">`;
      for (const l of langs) {
        const pct = Math.round(l.count / totalLang * 100);
        const acRate = l.count > 0 ? Math.round(l.acCount / l.count * 100) : 0;
        const col = langColors[l.language] || 'var(--accent)';
        html += `<div class="perf-lang-row">
          <div class="perf-lang-info">
            <span class="perf-lang-name" style="color:${col}">${this._esc(l.language?.toUpperCase() || '?')}</span>
            <span class="perf-lang-pct">${pct}%</span>
          </div>
          <div class="perf-lang-bar-wrap"><div class="perf-lang-bar" style="width:${pct}%;background:${col}"></div></div>
          <div class="perf-lang-meta"><span>${l.count} subs</span><span style="color:${acRate >= 60 ? 'var(--success)' : 'var(--warning)'}">${acRate}% AC</span></div>
        </div>`;
      }
      html += '</div></div>';
    }

    /* ═══════════════════════════════════════════════
       9. TAG RADAR — SVG radar chart + list
       ═══════════════════════════════════════════════ */
    const tags = d.tagAnalysis || [];
    if (tags.length) {
      // Build radar for top 8 tags by total problems
      const radarTags = [...tags].sort((a,b) => b.total - a.total).slice(0, 8);
      const radarSize = 200, radarCx = 100, radarCy = 100, radarR = 75;
      const n = radarTags.length;

      let radarSvg = '';
      // Grid rings
      for (let ring = 1; ring <= 4; ring++) {
        const r = radarR * ring / 4;
        const pts = Array.from({length: n}, (_, i) => {
          const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
          return `${radarCx + Math.cos(angle) * r},${radarCy + Math.sin(angle) * r}`;
        }).join(' ');
        radarSvg += `<polygon points="${pts}" fill="none" stroke="var(--border)" stroke-width="0.5"/>`;
      }
      // Axis lines
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        const x = radarCx + Math.cos(angle) * radarR;
        const y = radarCy + Math.sin(angle) * radarR;
        radarSvg += `<line x1="${radarCx}" y1="${radarCy}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="0.5"/>`;
      }
      // Data polygon
      const dataPts = radarTags.map((t, i) => {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        const r = radarR * t.solveRate / 100;
        return `${(radarCx + Math.cos(angle) * r).toFixed(1)},${(radarCy + Math.sin(angle) * r).toFixed(1)}`;
      }).join(' ');
      radarSvg += `<polygon points="${dataPts}" fill="rgba(29,78,216,0.15)" stroke="var(--accent)" stroke-width="2"/>`;
      // Data points + labels
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
        const r = radarR * radarTags[i].solveRate / 100;
        const px = radarCx + Math.cos(angle) * r;
        const py = radarCy + Math.sin(angle) * r;
        const lx = radarCx + Math.cos(angle) * (radarR + 14);
        const ly = radarCy + Math.sin(angle) * (radarR + 14);
        const anchor = lx < radarCx - 10 ? 'end' : lx > radarCx + 10 ? 'start' : 'middle';
        radarSvg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="var(--accent)"/>`;
        radarSvg += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}" fill="var(--text-muted)" font-size="8" font-weight="600">${radarTags[i].tag.slice(0, 12)}</text>`;
      }

      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-target" style="font-size:14px"></i> skill.radar()</div>
        <div class="perf-radar-wrap">
          <svg class="perf-radar-svg" viewBox="0 0 ${radarSize} ${radarSize}">${radarSvg}</svg>
          <div class="perf-weakness">`;
      // Full tag list
      for (const a of tags.slice(0, 20)) {
        const color = a.solveRate >= 80 ? 'var(--success)' : a.solveRate >= 50 ? 'var(--warning)' : 'var(--danger)';
        html += `<div class="weakness-row">
          <span class="weakness-tag">${this._esc(a.tag)}</span>
          <div class="weakness-bar-wrap"><div class="weakness-bar" style="width:${a.solveRate}%;background:${color}"></div></div>
          <span class="weakness-rate" style="color:${color}">${a.solveRate}%</span>
          <span class="text-sm text-muted">${a.solved}/${a.total}</span>
          <span class="text-sm text-muted">peak ${a.maxRating}</span>
        </div>`;
      }
      html += '</div></div></div>';
    }

    /* ═══════════════════════════════════════════════
       10. PLATFORM SPLIT
       ═══════════════════════════════════════════════ */
    const platforms = d.platformDist || [];
    if (platforms.length) {
      const totalPlat = platforms.reduce((s, p) => s + p.count, 0) || 1;
      const platColors = { codeforces: '#3b82f6', codechef: '#059669', atcoder: '#14b8a6' };
      const platNames = { codeforces: 'Codeforces', codechef: 'CodeChef', atcoder: 'AtCoder' };
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-arena" style="font-size:14px"></i> Platform Split</div>
        <div class="perf-platform-bars">`;
      // Stacked bar
      html += '<div class="perf-plat-stack">';
      for (const p of platforms) {
        const pct = Math.round(p.count / totalPlat * 100);
        const col = platColors[p.platform] || 'var(--accent)';
        html += `<div class="perf-plat-seg" style="width:${Math.max(pct, 3)}%;background:${col}" title="${platNames[p.platform] || p.platform}: ${p.count} (${pct}%)"></div>`;
      }
      html += '</div><div class="perf-plat-legend">';
      for (const p of platforms) {
        const col = platColors[p.platform] || 'var(--accent)';
        html += `<span><span class="perf-dot" style="background:${col}"></span>${platNames[p.platform] || p.platform} <span class="text-muted">${p.count}</span></span>`;
      }
      html += '</div></div></div>';
    }

    /* ═══════════════════════════════════════════════
       11. HARDEST SOLVED + MOST STRUGGLED
       ═══════════════════════════════════════════════ */
    html += '<div class="perf-dual mt-3">';

    // Hardest
    const hardest = d.hardestSolved || [];
    if (hardest.length) {
      html += `<div class="perf-section" style="flex:1">
        <div class="perf-section-header"><i class="icon-fire" style="font-size:14px"></i> Hardest Solved</div>`;
      for (const p of hardest) {
        html += `<div class="perf-recent-row" onclick="App.openSolve(${p.id})">
          <span class="perf-recent-verdict" style="color:var(--success)">AC</span>
          <span class="perf-recent-title">${this._esc(p.title)}</span>
          <span class="perf-recent-rating ${this._ratingClass(p.rating)}">${p.rating}</span>
          <span class="text-sm text-muted">${p.attempts} try${p.attempts !== 1 ? 's' : ''}</span>
        </div>`;
      }
      html += '</div>';
    }

    // Most struggled
    const struggled = d.mostAttempted || [];
    if (struggled.length) {
      html += `<div class="perf-section" style="flex:1">
        <div class="perf-section-header"><i class="icon-target" style="font-size:14px"></i> Most Struggled</div>`;
      for (const p of struggled) {
        const solved = p.solve_status === 'solved';
        html += `<div class="perf-recent-row" onclick="App.openSolve(${p.id})">
          <span class="perf-recent-verdict" style="color:${solved ? 'var(--success)' : 'var(--danger)'}">${solved ? 'AC' : 'WIP'}</span>
          <span class="perf-recent-title">${this._esc(p.title)}</span>
          <span class="perf-recent-rating ${this._ratingClass(p.rating)}">${p.rating || '?'}</span>
          <span class="text-sm" style="color:var(--danger)">${p.attempts} tries</span>
        </div>`;
      }
      html += '</div>';
    }
    html += '</div>';

    /* ═══════════════════════════════════════════════
       12. DIFFICULTY MILESTONES — first solve per tier
       ═══════════════════════════════════════════════ */
    const firsts = d.firstSolves || [];
    if (firsts.length) {
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-trophy" style="font-size:14px"></i> Difficulty Milestones — First Solve</div>
        <div class="perf-milestones">`;
      for (const f of firsts) {
        const dateStr = f.firstDate ? new Date(f.firstDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        html += `<div class="perf-milestone">
          <div class="perf-milestone-badge">${this._esc(f.bracket)}</div>
          <div class="perf-milestone-info">
            <span class="perf-milestone-title">${this._esc(f.firstTitle || '—')}</span>
            <span class="perf-milestone-date">${dateStr}</span>
          </div>
        </div>`;
      }
      html += '</div></div>';
    }

    /* ═══════════════════════════════════════════════
       13. RECOMMENDED PRACTICE
       ═══════════════════════════════════════════════ */
    const recs = d.recommendations || [];
    if (recs.length) {
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-spark" style="font-size:14px"></i> Recommended Practice — Weakest Areas</div>`;
      for (const rec of recs) {
        html += `<div class="perf-rec-group">
          <div class="perf-rec-tag"><strong>${this._esc(rec.tag)}</strong><span class="perf-rec-rate" style="color:var(--danger)">${rec.solveRate}%</span></div>`;
        if (rec.problems) {
          for (const p of rec.problems) {
            const solved = p.solve_status === 'solved';
            html += `<div class="lrm-problem ${solved ? 'solved' : ''}" onclick="App.openSolve(${p.id})">
              <div class="lrm-problem-status">${solved ? '<i class="icon-check" style="font-size:12px;color:var(--success)"></i>' : '<span class="lrm-problem-dot"></span>'}</div>
              <div class="lrm-problem-info"><span class="lrm-problem-title">${this._esc(p.title)}</span></div>
              <span class="lrm-problem-rating ${this._ratingClass(p.rating)}">${p.rating || '?'}</span>
            </div>`;
          }
        }
        html += '</div>';
      }
      html += '</div>';
    }

    /* ═══════════════════════════════════════════════
       14. RECENT SUBMISSIONS
       ═══════════════════════════════════════════════ */
    const recent = d.recent || [];
    if (recent.length) {
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-clock" style="font-size:14px"></i> Recent Submissions</div>
        <div class="perf-recent">`;
      for (const s of recent.slice(0, 15)) {
        const vColor = s.verdict === 'AC' ? 'var(--success)' : s.verdict === 'WA' ? 'var(--danger)' : s.verdict === 'TLE' ? 'var(--warning)' : 'var(--text-muted)';
        const timeStr = s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '';
        html += `<div class="perf-recent-row" onclick="App.openSolve(${s.problem_id || s.id})">
          <span class="perf-recent-verdict" style="color:${vColor}">${this._esc(s.verdict)}</span>
          <span class="perf-recent-title">${this._esc(s.title)}</span>
          <span class="perf-recent-rating ${this._ratingClass(s.rating)}">${s.rating || '?'}</span>
          <span class="perf-recent-time">${s.exec_time_ms ? s.exec_time_ms + 'ms' : ''}</span>
          <span class="perf-recent-date">${timeStr}</span>
        </div>`;
      }
      html += '</div></div>';
    }

    /* ═══════════════════════════════════════════════
       15. RANK PROGRESSION TIMELINE
       ═══════════════════════════════════════════════ */
    const titles = d.allTitles || [];
    if (titles.length) {
      html += `<div class="perf-section mt-3">
        <div class="perf-section-header"><i class="icon-arena" style="font-size:14px"></i> Rank Progression</div>
        <div class="perf-ranks">`;
      for (const t of titles) {
        const isCurrent = t.level === lvl.level;
        const isPast = t.level < lvl.level;
        const cls = isCurrent ? 'current' : isPast ? 'past' : 'locked';
        html += `<div class="perf-rank ${cls}">
          <div class="perf-rank-dot" style="background:${isPast || isCurrent ? t.color : 'var(--border)'}; box-shadow:${isCurrent ? '0 0 8px ' + t.color : 'none'}">
            <span class="rank-badge">${t.badge || ''}</span>
          </div>
          <div class="perf-rank-info">
            <span class="perf-rank-name" style="color:${isPast || isCurrent ? t.color : 'var(--text-muted)'}">${this._esc(t.title)}</span>
            <span class="perf-rank-req">${t.minXp?.toLocaleString()} XP · ${t.minProblems} probs</span>
          </div>
          ${isCurrent ? '<span class="perf-rank-badge">YOU</span>' : ''}
        </div>`;
      }
      html += '</div></div>';
    }

    el.innerHTML = html;
  },

  /* ===================================================
     AI LAB
     =================================================== */
  _ailabCategory: 'all',
  _ailabView: 'grid', // 'grid' or 'solve'
  _ailabProblem: null,
  _ailabEditor: null,
  _ailabLang: 'python',

  async renderAILab(el) {
    const cat = this._ailabCategory;
    const catLabels = { all: 'All Domains', ml: 'Machine Learning', dl: 'Deep Learning', nlp: 'NLP', cv: 'Computer Vision', genai: 'Generative AI', rl: 'Reinforcement Learning' };
    const catColors = { ml: '#22c55e', dl: '#3b82f6', nlp: '#059669', cv: '#f59e0b', genai: '#d4a017', rl: '#14b8a6' };
    const catIcons = { ml: '<i class="icon-neural"></i>', dl: '<i class="icon-bolt"></i>', nlp: '<i class="icon-chat"></i>', cv: '<i class="icon-eye"></i>', genai: '<i class="icon-spark"></i>', rl: '<i class="icon-gamepad"></i>' };

    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-neural" style="font-size:28px"></i> <span class="glitch" data-text="AI Lab">AI Lab</span></h1>
        <p>python3 neural_net.py --mode=challenge --eval=true</p>
      </div>
      <div id="nfStats" class="nf-stats-bar"></div>
      <div class="nf-categories">
        ${Object.entries(catLabels).map(([k, v]) => `<button class="nf-cat-btn ${k === cat ? 'active' : ''}" onclick="App._ailabCategory='${k}';App.renderAILab(document.getElementById('pageContent'))">${k !== 'all' ? catIcons[k] + ' ' : '<i class="icon-fire"></i> '}${v}</button>`).join('')}
      </div>
      <div id="ailabGrid" class="ailab-grid"><div class="loader"><div class="loader-ring"></div><div class="loader-dots"><span></span><span></span><span></span></div></div></div>`;

    // Stats bar
    const stats = await API.getAiStats();
    if (stats.ok) {
      const pct = stats.total > 0 ? Math.round(stats.solved / stats.total * 100) : 0;
      document.getElementById('nfStats').innerHTML = `
        <div class="nf-stat"><span class="nf-stat-num">${stats.total}</span><span class="nf-stat-label">Problems</span></div>
        <div class="nf-stat"><span class="nf-stat-num green">${stats.solved}</span><span class="nf-stat-label">Solved</span></div>
        <div class="nf-stat"><span class="nf-stat-num brand">${stats.inProgress}</span><span class="nf-stat-label">In Progress</span></div>
        <div class="nf-stat-ring">
          <svg viewBox="0 0 36 36" width="52" height="52">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--surface-2)" stroke-width="3"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linecap="round"
              stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="25" style="transition:stroke-dasharray .6s"/>
            <text x="18" y="20.5" text-anchor="middle" fill="var(--text-bright)" font-size="8" font-weight="700" font-family="var(--font-game)">${pct}%</text>
          </svg>
        </div>`;
    }

    const data = await API.getAiProblems(cat === 'all' ? '' : cat);
    if (!data.ok) return;
    const grid = document.getElementById('ailabGrid');
    if (!data.problems.length) {
      grid.innerHTML = '<div class="empty-state"><h3>// 0 matching problems</h3></div>';
      return;
    }
    const _aiVisualMap = { ml: 'neural', dl: 'neural', nlp: 'spark', cv: 'search', genai: 'spark', rl: 'nodes' };
    grid.innerHTML = data.problems.map((p, i) => {
      const status = p.progress ? p.progress.status : 'unsolved';
      const statusIcon = status === 'solved' ? 'check' : status === 'in-progress' ? 'clock' : 'lock';
      const tags = JSON.parse(p.tags || '[]');
      const samples = JSON.parse(p.samples || '[]');
      const hasSamples = samples.length > 0;
      const diffClass = p.difficulty === 'beginner' ? 'green' : p.difficulty === 'intermediate' ? 'amber' : 'red';
      const vis = _aiVisualMap[p.category] || 'grid';
      return `
        <div class="ailab-card ${status}" onclick="App.openAiProblem(${p.id})" style="animation-delay:${i * 0.06}s">
          <div class="ailab-card-visual lv-${vis}">
            <div class="learn-card-icon-wrap">
              <i class="${(catIcons[p.category] || '<i class="icon-neural"></i>').replace(/<\/?i[^>]*>/g, '')} learn-card-icon" style="color:${catColors[p.category] || 'var(--brand)'}"></i>
              ${status === 'solved' ? '<div class="learn-card-check"><i class="icon-check"></i></div>' : ''}
            </div>
          </div>
          <div class="ailab-card-body">
            <div class="ailab-card-header">
              <span class="ailab-card-cat" style="color:${catColors[p.category]}">${catIcons[p.category] || ''} ${catLabels[p.category] || p.category}</span>
              <span class="ailab-card-status ${status}"><i class="icon-${statusIcon}"></i></span>
            </div>
            <h3 class="ailab-card-title">${this._esc(p.title)}</h3>
            <p class="ailab-card-desc">${this._esc(p.description).substring(0, 120)}...</p>
            <div class="ailab-card-footer">
              <span class="ailab-diff ${diffClass}">${p.difficulty}</span>
              <div class="ailab-card-tags">
                ${hasSamples ? '<span class="ailab-tag" style="color:#22c55e;border:1px solid rgba(34,197,94,0.3)"><i class="icon-bolt"></i> Testable</span>' : ''}
                ${tags.slice(0, 2).map(t => `<span class="ailab-tag">${this._esc(t)}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  },

  async openAiProblem(id) {
    location.hash = '#/ailab/' + id;
  },

  async _openAiProblemPage(el, id) {
    const data = await API.getAiProblem(id);
    if (!data.ok) { location.hash = '#/ailab'; return; }
    this._ailabProblem = data.problem;
    this._ailabView = 'solve';
    this._renderAiSolve(el);
  },

  async _renderAiSolve(el) {
    const p = this._ailabProblem;
    const hints = JSON.parse(p.hints || '[]');
    const resources = JSON.parse(p.resources || '[]');
    const samples = JSON.parse(p.samples || '[]');
    const status = p.progress ? p.progress.status : 'unsolved';
    const catLabels = { ml: 'Machine Learning', dl: 'Deep Learning', nlp: 'NLP', cv: 'Computer Vision', genai: 'Generative AI', rl: 'Reinforcement Learning' };
    const catIcons = { ml: '<i class="icon-neural"></i>', dl: '<i class="icon-bolt"></i>', nlp: '<i class="icon-chat"></i>', cv: '<i class="icon-eye"></i>', genai: '<i class="icon-spark"></i>', rl: '<i class="icon-gamepad"></i>' };
    const diffClass = p.difficulty === 'beginner' ? 'green' : p.difficulty === 'intermediate' ? 'amber' : 'red';

    el.innerHTML = `
      <div class="nf-solve">
        <div class="nf-solve-header">
          <div class="fp-breadcrumb">
            <a href="#/ailab" class="fp-bc-link"><i class="icon-neural"></i> AI Lab</a>
            <i class="icon-chevron-right fp-bc-sep"></i>
            <span class="fp-bc-current">${this._esc(p.title)}</span>
          </div>
          <div class="nf-solve-title-row">
            <span class="ailab-modal-cat">${catIcons[p.category] || ''} ${catLabels[p.category] || p.category}</span>
            <span class="ailab-diff ${diffClass}">${p.difficulty}</span>
            <span class="nf-solve-status ${status}">${status === 'solved' ? '<i class="icon-circle-check"></i> Solved' : status === 'in-progress' ? '<i class="icon-sync"></i> In Progress' : '<i class="icon-square"></i> Unsolved'}</span>
          </div>
          <h2 class="nf-solve-title">${this._esc(p.title)}</h2>
        </div>
        <div class="nf-solve-body">
          <div class="nf-solve-left" id="nfSolveLeft">
            <div class="nf-statement-section">
              <h3><i class="icon-book"></i> Problem Statement</h3>
              <p>${this._esc(p.description)}</p>
            </div>
            ${p.input_format ? `<div class="nf-statement-section"><h3><i class="icon-download"></i> Input Format</h3><pre class="nf-format-block">${this._esc(p.input_format)}</pre></div>` : ''}
            ${p.output_format ? `<div class="nf-statement-section"><h3><i class="icon-send"></i> Output Format</h3><pre class="nf-format-block">${this._esc(p.output_format)}</pre></div>` : ''}
            ${p.constraints ? `<div class="nf-statement-section"><h3><i class="icon-shield"></i> Constraints</h3><pre class="nf-format-block">${this._esc(p.constraints)}</pre></div>` : ''}
            ${samples.length ? `
              <div class="nf-statement-section">
                <h3><i class="icon-test"></i> Examples</h3>
                ${samples.map((s, i) => `
                  <div class="nf-sample">
                    <div class="nf-sample-header">Example ${i + 1}</div>
                    <div class="nf-sample-io">
                      <div class="nf-sample-panel">
                        <div class="nf-sample-label">Input</div>
                        <pre class="nf-sample-pre">${this._esc(s.input)}</pre>
                        <button class="nf-copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(s.input).replace(/'/g,'\\\'')});App.toast('Copied!','success')" title="Copy input"><i class="icon-copy"></i></button>
                      </div>
                      <div class="nf-sample-panel">
                        <div class="nf-sample-label">Output</div>
                        <pre class="nf-sample-pre">${this._esc(s.output)}</pre>
                      </div>
                    </div>
                  </div>`).join('')}
              </div>` : ''}
            ${p.solution_approach ? `
              <div class="nf-statement-section">
                <h3><i class="icon-lightbulb"></i> Approach</h3>
                <div class="nf-approach-toggle" onclick="this.classList.toggle('revealed')">
                  <div class="nf-approach-label"><i class="icon-lock"></i> Click to reveal approach</div>
                  <p class="nf-approach-text">${this._esc(p.solution_approach)}</p>
                </div>
              </div>` : ''}
            ${hints.length ? `
              <div class="nf-statement-section">
                <h3><i class="icon-target"></i> Hints</h3>
                <div class="ailab-hints">
                  ${hints.map((h, i) => `
                    <div class="ailab-hint" onclick="this.classList.toggle('revealed')">
                      <div class="ailab-hint-label"><i class="icon-lock"></i> Hint ${i + 1} <span class="ailab-hint-click">(click to reveal)</span></div>
                      <div class="ailab-hint-text">${this._esc(h)}</div>
                    </div>`).join('')}
                </div>
              </div>` : ''}
            ${resources.length ? `
              <div class="nf-statement-section">
                <h3><i class="icon-external"></i> Resources</h3>
                <ul class="nf-resources">${resources.map(r => `<li><a href="${this._esc(r)}" target="_blank" rel="noopener"><i class="icon-link"></i> ${this._esc(r)}</a></li>`).join('')}</ul>
              </div>` : ''}
          </div>
          <div class="nf-solve-resizer" id="nfSolveResizer"></div>
          <div class="nf-solve-right" id="nfSolveRight">
            <div class="nf-editor-toolbar">
              <div class="nf-lang-info">
                <i class="icon-lang-python"></i> <span>Python 3</span>
              </div>
              <div class="nf-editor-actions">
                <button class="btn btn-ghost btn-sm" onclick="App._resetAiCode()" title="Reset Code"><i class="icon-reset"></i></button>
                <button class="btn btn-run btn-sm" onclick="App._runAiCode()" title="Run (Ctrl+Enter)"><i class="icon-run"></i> Run</button>
                <button class="btn btn-submit btn-sm" onclick="App._saveAiProgress(${p.id}, 'solved')"><i class="icon-check"></i> Mark Solved</button>
              </div>
            </div>
            <div id="nfMonacoEditor" class="nf-editor-container"></div>
            <div class="nf-bottom-panel">
              <div class="nf-bottom-tabs">
                <button class="nf-bottom-tab active" data-nftab="input" onclick="App._switchNfBottomTab('input',this)">
                  <i class="icon-download"></i> Custom Input
                </button>
                <button class="nf-bottom-tab" data-nftab="output" onclick="App._switchNfBottomTab('output',this)">
                  <i class="icon-terminal"></i> Output
                </button>
                <button class="nf-bottom-tab" data-nftab="samples" onclick="App._switchNfBottomTab('samples',this)">
                  <i class="icon-test"></i> Test Samples
                </button>
              </div>
              <div class="nf-bottom-body">
                <div id="nfTabInput" class="nf-tab-panel">
                  <textarea id="nfCustomInput" class="nf-io-textarea" placeholder="Enter custom input here...">${samples.length ? this._esc(samples[0].input) : ''}</textarea>
                </div>
                <div id="nfTabOutput" class="nf-tab-panel hidden">
                  <div id="nfOutputContent" class="nf-output-content">
                    <div class="output-placeholder">
                      <i class="icon-terminal" style="font-size:24px;opacity:0.3"></i>
                      <p>Run your code to see output</p>
                    </div>
                  </div>
                </div>
                <div id="nfTabSamples" class="nf-tab-panel hidden">
                  <div id="nfSampleResults" class="nf-sample-results">
                    ${samples.map((s, i) => `
                      <div class="nf-sample-result" id="nfSampleResult${i}">
                        <div class="nf-sr-header"><span>Sample ${i + 1}</span><span class="nf-sr-status"><i class="icon-square"></i> Not tested</span></div>
                        <div class="nf-sr-row"><span class="nf-sr-label">Input:</span><pre>${this._esc(s.input)}</pre></div>
                        <div class="nf-sr-row"><span class="nf-sr-label">Expected:</span><pre>${this._esc(s.output)}</pre></div>
                        <div class="nf-sr-row nf-sr-actual hidden"><span class="nf-sr-label">Got:</span><pre class="nf-sr-got"></pre></div>
                      </div>`).join('')}
                    ${!samples.length ? '<div class="output-placeholder"><p>No sample test cases for this problem</p></div>' : `<button class="btn btn-run btn-sm" onclick="App._runAiSamples()" style="margin-top:8px"><i class="icon-run"></i> Run All Samples</button>`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    // Scroll to top
    document.getElementById('mainContent').scrollTop = 0;

    // Init Monaco editor
    this._initAiEditor(p);

    // Resizer
    const resizer = document.getElementById('nfSolveResizer');
    if (resizer) {
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const left = document.getElementById('nfSolveLeft');
        const right = document.getElementById('nfSolveRight');
        const startX = e.clientX;
        const startW = left.offsetWidth;
        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const newW = Math.max(300, Math.min(startW + dx, window.innerWidth - 400));
          left.style.width = newW + 'px';
          left.style.flex = 'none';
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if (this._ailabEditor) this._ailabEditor.layout();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }
  },

  _initAiEditor(problem) {
    const container = document.getElementById('nfMonacoEditor');
    if (!container) return;
    const code = (problem.starter_code || '').replace(/\\n/g, '\n');
    if (typeof monaco !== 'undefined') {
      if (this._ailabEditor) { this._ailabEditor.dispose(); this._ailabEditor = null; }
      this._ailabEditor = monaco.editor.create(container, {
        value: code,
        language: 'python',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        automaticLayout: true,
        lineNumbers: 'on',
        renderWhitespace: 'none',
        tabSize: 4,
      });
      this._ailabEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => this._runAiCode());
    } else {
      container.innerHTML = `<textarea id="nfCodeFallback" class="nf-io-textarea" style="height:100%;font-family:monospace;font-size:14px">${this._esc(code)}</textarea>`;
    }
  },

  _getAiCode() {
    if (this._ailabEditor) return this._ailabEditor.getValue();
    const fb = document.getElementById('nfCodeFallback');
    return fb ? fb.value : '';
  },

  _resetAiCode() {
    if (!this._ailabProblem) return;
    const code = (this._ailabProblem.starter_code || '').replace(/\\n/g, '\n');
    if (this._ailabEditor) this._ailabEditor.setValue(code);
    else { const fb = document.getElementById('nfCodeFallback'); if (fb) fb.value = code; }
    this.toast('[reset] code reverted to template', 'info');
  },

  _switchNfBottomTab(tab, btn) {
    document.querySelectorAll('.nf-bottom-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.nf-tab-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById('nfTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (panel) panel.classList.remove('hidden');
  },

  async _runAiCode() {
    const code = this._getAiCode();
    const input = document.getElementById('nfCustomInput')?.value || '';
    // Switch to output tab
    document.querySelectorAll('.nf-bottom-tab').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-nftab="output"]')?.classList.add('active');
    document.querySelectorAll('.nf-tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('nfTabOutput')?.classList.remove('hidden');
    const outputEl = document.getElementById('nfOutputContent');
    if (outputEl) outputEl.innerHTML = '<div class="loader"><div class="loader-ring"></div><div class="loader-dots"><span></span><span></span><span></span></div></div>';
    try {
      const res = await API.run(code, input, 'python');
      if (outputEl) {
        if (res.error) {
          outputEl.innerHTML = `<pre class="nf-output-error">${this._esc(res.error)}</pre>`;
        } else {
          outputEl.innerHTML = `<pre class="nf-output-success">${this._esc(res.output || '(no output)')}</pre>
            ${res.exec_time ? `<div class="nf-output-meta">⏱ ${res.exec_time}ms</div>` : ''}`;
        }
      }
    } catch (e) {
      if (outputEl) outputEl.innerHTML = `<pre class="nf-output-error">Error: ${this._esc(e.message)}</pre>`;
    }
  },

  async _runAiSamples() {
    const code = this._getAiCode();
    const samples = JSON.parse(this._ailabProblem?.samples || '[]');
    if (!samples.length) return;
    // Switch to samples tab
    document.querySelectorAll('.nf-bottom-tab').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-nftab="samples"]')?.classList.add('active');
    document.querySelectorAll('.nf-tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('nfTabSamples')?.classList.remove('hidden');

    let allPassed = true;
    for (let i = 0; i < samples.length; i++) {
      const el = document.getElementById(`nfSampleResult${i}`);
      if (!el) continue;
      const statusEl = el.querySelector('.nf-sr-status');
      const actualRow = el.querySelector('.nf-sr-actual');
      const gotPre = el.querySelector('.nf-sr-got');
      if (statusEl) statusEl.innerHTML = '<i class="icon-hourglass"></i> Running...';
      try {
        const res = await API.run(code, samples[i].input, 'python');
        if (actualRow) actualRow.classList.remove('hidden');
        const got = (res.output || '').trim();
        const expected = samples[i].output.trim();
        if (gotPre) gotPre.textContent = got;
        const pass = got === expected;
        if (!pass) allPassed = false;
        if (statusEl) { statusEl.innerHTML = pass ? '<i class="icon-circle-check"></i> Passed' : '<i class="icon-circle-x"></i> Failed'; statusEl.className = 'nf-sr-status ' + (pass ? 'pass' : 'fail'); }
        if (res.error && statusEl) { statusEl.innerHTML = '<i class="icon-circle-x"></i> Error'; statusEl.className = 'nf-sr-status fail'; if (gotPre) gotPre.textContent = res.error; }
      } catch (e) {
        if (statusEl) { statusEl.innerHTML = '<i class="icon-circle-x"></i> Error'; statusEl.className = 'nf-sr-status fail'; }
        if (gotPre) gotPre.textContent = e.message;
        allPassed = false;
      }
    }
    if (allPassed && samples.length > 0) {
      this.toast('[test] all samples passed ✔', 'success');
    }
  },

  async _saveAiProgress(id, status) {
    await API.updateAiProgress(id, { status, notes: '' });
    this.toast(status === 'solved' ? '[AC] problem conquered!' : '[save] progress stored', 'success');
    if (status === 'solved') {
      this._ailabView = 'grid';
      this._ailabProblem = null;
      location.hash = '#/ailab';
    }
  },

  /* ===================================================
     LEARN — Tutorial System
     =================================================== */
  _learnCategory: 'all',
  _learnView: 'grid',

  _topicAnim: {
    'complexity':'bars','arrays':'bars','sorting':'bars','segment-trees':'bars',
    'graphs':'nodes','linked-lists':'nodes','disjoint-set':'nodes',
    'trees':'tree','tries':'tree','heaps':'tree','ensemble-methods':'tree',
    'deep-learning-fundamentals':'neural','cnns':'neural','reinforcement-learning':'neural',
    'dynamic-programming':'grid','linear-algebra-ml':'grid',
    'probability-stats':'wave','number-theory':'wave','geometry':'wave',
    'binary-search':'search','string-algorithms':'search','hashing':'search',
    'data-preprocessing':'flow','model-deployment':'flow','supervised-learning':'flow',
    'unsupervised-learning':'cluster','stacks-queues':'stack',
    'generative-ai':'spark','nlp':'spark','game-theory':'spark',
    'ethics-ai':'spark','bit-manipulation':'binary','greedy':'spark',
    // GATE topics
    'os-process-mgmt':'gear','os-synchronization':'gear','os-deadlocks':'gear',
    'os-memory':'gear','os-virtual-memory':'gear','os-file-systems':'gear',
    'dbms-er-relational':'database','dbms-relational-algebra':'database',
    'dbms-normalization':'database','dbms-transactions':'database','dbms-indexing':'database',
    'cn-models':'network','cn-datalink':'network','cn-network':'network',
    'cn-routing':'network','cn-transport':'network','cn-application':'network',
    'toc-finite-automata':'automata','toc-regular':'automata','toc-cfg':'automata',
    'toc-turing':'automata','toc-complexity':'automata',
    'cd-lexical':'compiler','cd-parsing':'compiler','cd-sdt':'compiler','cd-optimization':'compiler',
    'coa-number-systems':'circuit','coa-processor':'circuit','coa-memory':'circuit','coa-io':'circuit',
    'dl-boolean':'logic','dl-combinational':'logic','dl-sequential':'logic',
    'dm-logic':'proof','dm-sets-relations':'proof','dm-combinatorics':'proof','dm-groups':'proof',
    'math-linear-algebra':'matrix','math-calculus':'matrix','math-probability':'matrix',
    // Other CS subjects
    'se-sdlc':'blueprint','se-testing':'blueprint','se-design-patterns':'blueprint',
    'oop-fundamentals':'diamond','oop-inheritance-poly':'diamond','oop-solid':'diamond',
    'web-fundamentals':'globe2','web-frontend':'globe2','web-backend':'globe2',
    'security-fundamentals':'shield','security-cryptography':'shield','security-network':'shield',
    'cloud-fundamentals':'cloud','cloud-containers':'cloud','cloud-architecture':'cloud',
    'graphics-fundamentals':'prism','graphics-3d':'prism',
    'distributed-fundamentals':'scatter','distributed-consensus':'scatter',
    'ds-eda':'chart2','ds-visualization':'chart2','ds-statistics':'chart2',
    'parallel-fundamentals':'threads','parallel-sync':'threads',
    'iot-fundamentals':'signal','iot-platforms':'signal',
    'blockchain-fundamentals':'chain','blockchain-smart-contracts':'chain',
    'embedded-fundamentals':'chip','embedded-rtos':'chip',
    'hci-principles':'cursor','hci-evaluation':'cursor',
    'ir-fundamentals':'lens','ir-web-search':'lens',
    'numerical-root-finding':'integral','numerical-integration':'integral',
    'bigdata-ecosystem':'warehouse','bigdata-nosql':'warehouse',
    // Programming Languages
    'c-basics':'terminal2','c-pointers':'terminal2','c-advanced':'terminal2',
    'cpp-basics':'cplusplus','cpp-stl':'cplusplus','cpp-modern':'cplusplus',
    'java-basics':'coffee','java-oop':'coffee','java-advanced':'coffee',
    'python-basics':'snake','python-oop-modules':'snake','python-advanced':'snake',
    'js-basics':'brackets','js-async':'brackets','js-advanced':'brackets',
    'go-basics':'gopher','go-concurrency':'gopher',
    'rust-basics':'crab','rust-advanced':'crab',
    'ts-basics':'typescript2','ts-advanced':'typescript2',
    // System Design
    'sd-hld-basics':'architect','sd-hld-patterns':'architect','sd-lld-principles':'architect','sd-lld-cases':'architect',
    // Computer Vision
    'cv-fundamentals':'vision','cv-detection':'vision','cv-advanced':'vision',
    // NLP
    'nlp-fundamentals':'textwave','nlp-transformers':'textwave','nlp-applications':'textwave'
  },

  _learnSubjects: [
    { id: 'ds', name: 'Data Structures', desc: 'Master arrays, linked lists, stacks, queues, trees, heaps, tries, and advanced structures', icon: 'tree', anim: 'nodes', color: '#1d4ed8', categories: ['cp'], topics: ['arrays','stacks-queues','hashing','linked-lists','heaps','trees','tries','segment-trees','disjoint-set'] },
    { id: 'algo', name: 'Algorithms', desc: 'Sorting, searching, DP, graphs, greedy, number theory, bit manipulation, and geometry', icon: 'code', anim: 'bars', color: '#8b5cf6', categories: ['cp'], topics: ['complexity','sorting','binary-search','dynamic-programming','graphs','greedy','number-theory','bit-manipulation','string-algorithms','game-theory','geometry'] },
    // AI & Machine Learning
    { id: 'ml', name: 'Machine Learning', desc: 'From fundamentals to deployment — regression, classification, ensembles, and MLOps', icon: 'chart', anim: 'flow', color: '#10b981', categories: ['ai'], topics: ['linear-algebra-ml','probability-stats','data-preprocessing','supervised-learning','unsupervised-learning','ensemble-methods','model-deployment','ethics-ai','ml-fundamentals'], aiml: true },
    { id: 'dl', name: 'Deep Learning', desc: 'Neural networks, CNNs, backpropagation, and modern architectures from scratch', icon: 'neural', anim: 'neural', color: '#8b5cf6', categories: ['ai'], topics: ['deep-learning-fundamentals','cnns'], aiml: true },
    { id: 'ai', name: 'Artificial Intelligence', desc: 'Reinforcement learning, transformers, generative AI, and large language models', icon: 'spark', anim: 'spark', color: '#f59e0b', categories: ['ai'], topics: ['reinforcement-learning','generative-ai'], aiml: true },
    { id: 'cv', name: 'Computer Vision', desc: 'Image processing, object detection, segmentation, GANs, and visual recognition systems', icon: 'eye-ai', anim: 'vision', color: '#e11d48', categories: ['cv'], aiml: true },
    { id: 'nlp', name: 'Natural Language Processing', desc: 'Text processing, embeddings, transformers, LLMs, sentiment analysis, and language generation', icon: 'nlp', anim: 'textwave', color: '#0ea5e9', categories: ['nlpcat'], aiml: true },
    { id: 'datascience', name: 'Data Science & Analytics', desc: 'EDA, visualization, statistical analysis, hypothesis testing, and regression', icon: 'chart', anim: 'chart2', color: '#16a34a', categories: ['datascience'], aiml: true },
    { id: 'os', name: 'Operating Systems', desc: 'Process management, synchronization, memory, file systems — GATE focused', icon: 'cpu', anim: 'gear', color: '#ef4444', categories: ['os'], gate: true },
    { id: 'dbms', name: 'Database Systems', desc: 'ER model, SQL, normalization, transactions, indexing — GATE focused', icon: 'dataset', anim: 'database', color: '#3b82f6', categories: ['dbms'], gate: true },
    { id: 'cn', name: 'Computer Networks', desc: 'TCP/IP, routing, transport layer, application protocols — GATE focused', icon: 'globe', anim: 'network', color: '#14b8a6', categories: ['cn'], gate: true },
    { id: 'toc', name: 'Theory of Computation', desc: 'Automata, grammars, Turing machines, decidability, complexity — GATE focused', icon: 'infinity', anim: 'automata', color: '#059669', categories: ['toc'], gate: true },
    { id: 'cd', name: 'Compiler Design', desc: 'Lexical analysis, parsing, SDT, code optimization — GATE focused', icon: 'terminal', anim: 'compiler', color: '#f97316', categories: ['cd'], gate: true },
    { id: 'coa', name: 'Computer Organization', desc: 'Number systems, pipelining, cache, I/O organization — GATE focused', icon: 'cpu', anim: 'circuit', color: '#d4a017', categories: ['coa'], gate: true },
    { id: 'digital', name: 'Digital Logic', desc: 'Boolean algebra, combinational & sequential circuits, flip-flops — GATE focused', icon: 'bolt', anim: 'logic', color: '#22c55e', categories: ['digital'], gate: true },
    { id: 'discrete', name: 'Discrete Mathematics', desc: 'Logic, sets, relations, combinatorics, graph theory, groups — GATE focused', icon: 'puzzle', anim: 'proof', color: '#14b8a6', categories: ['discrete'], gate: true },
    { id: 'math', name: 'Engineering Mathematics', desc: 'Linear algebra, calculus, probability & statistics — GATE focused', icon: 'chart', anim: 'matrix', color: '#eab308', categories: ['math'], gate: true },
    // Other CS Subjects
    { id: 'se', name: 'Software Engineering', desc: 'SDLC models, testing strategies, design patterns, and agile methodology', icon: 'layers', anim: 'blueprint', color: '#6d28d9', categories: ['se'], other: true },
    { id: 'oop', name: 'Object-Oriented Programming', desc: 'Classes, inheritance, polymorphism, SOLID principles, and clean design', icon: 'diamond', anim: 'diamond', color: '#0ea5e9', categories: ['oop'], other: true },
    { id: 'web', name: 'Web Technologies', desc: 'HTTP, REST APIs, frontend development, backend & database integration', icon: 'globe', anim: 'globe2', color: '#f43f5e', categories: ['web'], other: true },
    { id: 'security', name: 'Cyber Security', desc: 'Cryptography, network security, OWASP vulnerabilities, and defense mechanisms', icon: 'shield', anim: 'shield', color: '#dc2626', categories: ['security'], other: true },
    { id: 'cloud', name: 'Cloud Computing', desc: 'IaaS/PaaS/SaaS, Docker, Kubernetes, serverless, and cloud architecture patterns', icon: 'cloud', anim: 'cloud', color: '#2563eb', categories: ['cloud'], other: true },
    { id: 'graphics', name: 'Computer Graphics', desc: '2D/3D transformations, rendering pipeline, shading models, and rasterization', icon: 'palette', anim: 'prism', color: '#d946ef', categories: ['graphics'], other: true },
    { id: 'distributed', name: 'Distributed Systems', desc: 'CAP theorem, consensus algorithms, replication, and fault tolerance', icon: 'share', anim: 'scatter', color: '#0891b2', categories: ['distributed'], other: true },
    { id: 'parallel', name: 'Parallel Computing', desc: 'Threads, synchronization, Amdahl\'s law, map-reduce, and GPU computing', icon: 'cpu', anim: 'threads', color: '#7c3aed', categories: ['parallel'], other: true },
    { id: 'iot', name: 'Internet of Things', desc: 'IoT architecture, MQTT, edge computing, sensors, and smart applications', icon: 'radio', anim: 'signal', color: '#059669', categories: ['iot'], other: true },
    { id: 'blockchain', name: 'Blockchain Technology', desc: 'Distributed ledger, consensus mechanisms, smart contracts, and DApps', icon: 'link', anim: 'chain', color: '#ea580c', categories: ['blockchain'], other: true },
    { id: 'embedded', name: 'Embedded Systems', desc: 'Microcontrollers, RTOS, firmware development, and real-time constraints', icon: 'cpu', anim: 'chip', color: '#4f46e5', categories: ['embedded'], other: true },
    { id: 'hci', name: 'Human-Computer Interaction', desc: 'Usability heuristics, UX research, accessibility, and design evaluation', icon: 'cursor', anim: 'cursor', color: '#e11d48', categories: ['hci'], other: true },
    { id: 'ir', name: 'Information Retrieval', desc: 'Search engines, indexing, TF-IDF, PageRank, and web search ranking', icon: 'search', anim: 'lens', color: '#ca8a04', categories: ['ir'], other: true },
    { id: 'numerical', name: 'Numerical Methods', desc: 'Root finding, interpolation, numerical integration, and ODE solvers', icon: 'calculator', anim: 'integral', color: '#9333ea', categories: ['numerical'], other: true },
    { id: 'bigdata', name: 'Big Data & NoSQL', desc: 'Hadoop, Spark, MapReduce, NoSQL databases, and large-scale data processing', icon: 'database', anim: 'warehouse', color: '#0d9488', categories: ['bigdata'], other: true },
    // Programming Languages
    { id: 'clang', name: 'C', desc: 'Systems programming — pointers, memory management, structs, file I/O, and preprocessor', icon: 'terminal', anim: 'terminal2', color: '#555555', categories: ['clang'], lang: true },
    { id: 'cpp', name: 'C++', desc: 'OOP, STL containers, templates, smart pointers, and modern C++ (11/14/17/20)', icon: 'code', anim: 'cplusplus', color: '#004482', categories: ['cpp'], lang: true },
    { id: 'java', name: 'Java', desc: 'JVM, OOP, generics, collections framework, streams, multithreading, and records', icon: 'coffee', anim: 'coffee', color: '#f89820', categories: ['java'], lang: true },
    { id: 'python', name: 'Python', desc: 'Dynamic typing, decorators, generators, async/await, and metaprogramming', icon: 'code', anim: 'snake', color: '#3776ab', categories: ['python'], lang: true },
    { id: 'javascript', name: 'JavaScript', desc: 'ES6+, closures, promises, async/await, event loop, and metaprogramming', icon: 'bolt', anim: 'brackets', color: '#f7df1e', categories: ['javascript'], lang: true },
    { id: 'golang', name: 'Go', desc: 'Goroutines, channels, interfaces, concurrency patterns, and systems programming', icon: 'code', anim: 'gopher', color: '#00add8', categories: ['golang'], lang: true },
    { id: 'rust', name: 'Rust', desc: 'Ownership, borrowing, lifetimes, traits, generics, and zero-cost abstractions', icon: 'shield', anim: 'crab', color: '#ce422b', categories: ['rust'], lang: true },
    { id: 'typescript', name: 'TypeScript', desc: 'Static types, interfaces, generics, mapped/conditional types, and utility types', icon: 'code', anim: 'typescript2', color: '#3178c6', categories: ['typescript'], lang: true },
    // System Design
    { id: 'sysdesign', name: 'System Design', desc: 'HLD, LLD, scalability patterns, design case studies, and SOLID principles', icon: 'layers', anim: 'architect', color: '#7c3aed', categories: ['sysdesign'], sysdesign: true },
  ],

  _topicPapers: {
    'complexity': [
      {t:'Big Omicron and Big Omega and Big Theta',a:'Knuth, D.E.',y:1976,v:'ACM SIGACT News',u:'https://doi.org/10.1145/1008328.1008329'},
      {t:'Introduction to Algorithms (CLRS)',a:'Cormen, Leiserson, Rivest, Stein',y:2022,v:'MIT Press, 4th Edition',u:'https://mitpress.mit.edu/9780262046305/'},
      {t:'The Complexity of Theorem-Proving Procedures',a:'Cook, S.A.',y:1971,v:'STOC',u:'https://doi.org/10.1145/800157.805047'}
    ],
    'arrays': [
      {t:'Programming Pearls',a:'Bentley, J.',y:1986,v:'Addison-Wesley',u:'https://doi.org/10.1145/6424.315122'},
      {t:'Maximum Subarray Problem (Kadane Algorithm)',a:'Kadane, J.B.',y:1984,v:'Carnegie Mellon University',u:'https://en.wikipedia.org/wiki/Maximum_subarray_problem'},
      {t:'The Art of Computer Programming, Vol. 3',a:'Knuth, D.E.',y:1973,v:'Addison-Wesley',u:'https://www-cs-faculty.stanford.edu/~knuth/taocp.html'}
    ],
    'sorting': [
      {t:'Quicksort',a:'Hoare, C.A.R.',y:1962,v:'The Computer Journal',u:'https://doi.org/10.1093/comjnl/5.1.10'},
      {t:'Introspective Sorting and Selection Algorithms',a:'Musser, D.R.',y:1997,v:'Software: Practice and Experience',u:'https://doi.org/10.1002/(SICI)1097-024X(199708)27:8<983::AID-SPE117>3.0.CO;2-%23'},
      {t:'Timsort — Adaptive Merge Sort',a:'Peters, T.',y:2002,v:'Python Dev',u:'https://en.wikipedia.org/wiki/Timsort'}
    ],
    'binary-search': [
      {t:'The Art of Computer Programming, Vol. 3: Sorting and Searching',a:'Knuth, D.E.',y:1973,v:'Addison-Wesley',u:'https://www-cs-faculty.stanford.edu/~knuth/taocp.html'},
      {t:'Programming Pearls: Writing Correct Programs',a:'Bentley, J.',y:1983,v:'Communications of the ACM',u:'https://doi.org/10.1145/358234.358244'},
      {t:'Nearly All Binary Searches and Mergesorts Are Broken',a:'Bloch, J.',y:2006,v:'Google Research Blog',u:'https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/'}
    ],
    'stacks-queues': [
      {t:'Shunting-yard Algorithm',a:'Dijkstra, E.W.',y:1961,v:'Numerische Mathematik',u:'https://en.wikipedia.org/wiki/Shunting-yard_algorithm'},
      {t:'Compilers: Principles, Techniques, and Tools',a:'Aho, Sethi, Ullman',y:1986,v:'Addison-Wesley',u:'https://en.wikipedia.org/wiki/Compilers:_Principles,_Techniques,_and_Tools'},
      {t:'An O(1) Algorithm for Implementing the LRU Cache Eviction Scheme',a:'Various',y:2003,v:'Technical Report',u:'https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)'}
    ],
    'hashing': [
      {t:'Universal Classes of Hash Functions',a:'Carter, J.L. & Wegman, M.N.',y:1979,v:'JCSS',u:'https://doi.org/10.1016/0022-0000(79)90044-8'},
      {t:'Cuckoo Hashing',a:'Pagh, R. & Rodler, F.F.',y:2004,v:'Journal of Algorithms',u:'https://doi.org/10.1016/j.jalgor.2003.12.002'},
      {t:'Consistent Hashing and Random Trees',a:'Karger, D. et al.',y:1997,v:'STOC',u:'https://doi.org/10.1145/258533.258660'}
    ],
    'linked-lists': [
      {t:'The Art of Computer Programming, Vol. 1',a:'Knuth, D.E.',y:1968,v:'Addison-Wesley',u:'https://www-cs-faculty.stanford.edu/~knuth/taocp.html'},
      {t:'Skip Lists: A Probabilistic Alternative to Balanced Trees',a:'Pugh, W.',y:1990,v:'Communications of the ACM',u:'https://doi.org/10.1145/78973.78977'},
      {t:'Linked List Problems',a:'Parlante, N.',y:2001,v:'Stanford CS Library',u:'http://cslibrary.stanford.edu/103/LinkedListBasics.pdf'}
    ],
    'heaps': [
      {t:'Algorithm 232: Heapsort',a:'Williams, J.W.J.',y:1964,v:'Communications of the ACM',u:'https://doi.org/10.1145/512274.512284'},
      {t:'Fibonacci Heaps and Their Uses in Improved Network Optimization',a:'Fredman, M.L. & Tarjan, R.E.',y:1987,v:'JACM',u:'https://doi.org/10.1145/28869.28874'},
      {t:'Relaxed Heaps: An Alternative to Fibonacci Heaps',a:'Driscoll, J.R. et al.',y:1988,v:'Communications of the ACM',u:'https://doi.org/10.1145/63039.63042'}
    ],
    'dynamic-programming': [
      {t:'Dynamic Programming',a:'Bellman, R.',y:1957,v:'Princeton University Press',u:'https://press.princeton.edu/books/paperback/9780691146683/dynamic-programming'},
      {t:'Algorithms (Ch. 6: Dynamic Programming)',a:'Dasgupta, Papadimitriou, Vazirani',y:2006,v:'McGraw-Hill',u:'http://algorithmics.lsi.upc.edu/docs/Dasgupta-Papadimitriou-Vazirani.pdf'},
      {t:'The Design and Analysis of Computer Algorithms',a:'Aho, Hopcroft, Ullman',y:1974,v:'Addison-Wesley',u:'https://doi.org/10.5555/1074100'}
    ],
    'graphs': [
      {t:'A Note on Two Problems in Connexion with Graphs',a:'Dijkstra, E.W.',y:1959,v:'Numerische Mathematik',u:'https://doi.org/10.1007/BF01386390'},
      {t:'Depth-First Search and Linear Graph Algorithms',a:'Tarjan, R.E.',y:1972,v:'SIAM Journal on Computing',u:'https://doi.org/10.1137/0201010'},
      {t:'A Shortest Path Algorithm for Each Pair of Vertices',a:'Floyd, R.W.',y:1962,v:'Communications of the ACM',u:'https://doi.org/10.1145/367766.368168'}
    ],
    'greedy': [
      {t:'On the Shortest Spanning Subtree of a Graph',a:'Kruskal, J.B.',y:1956,v:'Proceedings of the AMS',u:'https://doi.org/10.1090/S0002-9939-1956-0078686-7'},
      {t:'A Method for the Construction of Minimum-Redundancy Codes',a:'Huffman, D.A.',y:1952,v:'Proceedings of the IRE',u:'https://doi.org/10.1109/JRPROC.1952.273898'},
      {t:'Matroids and the Greedy Algorithm',a:'Edmonds, J.',y:1971,v:'Mathematical Programming',u:'https://doi.org/10.1007/BF01584082'}
    ],
    'trees': [
      {t:'Fast Algorithms for Finding Nearest Common Ancestors',a:'Harel, D. & Tarjan, R.E.',y:1984,v:'SIAM Journal on Computing',u:'https://doi.org/10.1137/0213024'},
      {t:'Self-Adjusting Binary Search Trees (Splay Trees)',a:'Sleator, D.D. & Tarjan, R.E.',y:1985,v:'JACM',u:'https://doi.org/10.1145/3828.3835'},
      {t:'A Data Structure for Dynamic Trees',a:'Sleator, D.D. & Tarjan, R.E.',y:1983,v:'JCSS',u:'https://doi.org/10.1016/0022-0000(83)90006-5'}
    ],
    'number-theory': [
      {t:'PRIMES is in P',a:'Agrawal, N., Kayal, N. & Saxena, N.',y:2004,v:'Annals of Mathematics',u:'https://doi.org/10.4007/annals.2004.160.781'},
      {t:'A Fast Monte-Carlo Test for Primality',a:'Solovay, R. & Strassen, V.',y:1977,v:'SIAM Journal on Computing',u:'https://doi.org/10.1137/0206006'},
      {t:'Riemann Hypothesis and Tests for Primality',a:'Miller, G.L.',y:1976,v:'JCSS',u:'https://doi.org/10.1016/S0022-0000(76)80043-8'}
    ],
    'bit-manipulation': [
      {t:'The Art of Computer Programming, Vol. 4A: Combinatorial Algorithms',a:'Knuth, D.E.',y:2011,v:'Addison-Wesley',u:'https://www-cs-faculty.stanford.edu/~knuth/taocp.html'},
      {t:'Hackers Delight',a:'Warren, H.S.',y:2012,v:'Addison-Wesley, 2nd Edition',u:'https://en.wikipedia.org/wiki/Hacker%27s_Delight'},
      {t:'A New Method for Solving Subset Sum Problems',a:'Horowitz, E. & Sahni, S.',y:1974,v:'JACM',u:'https://doi.org/10.1145/321812.321823'}
    ],
    'segment-trees': [
      {t:'Solutions to Klee Rectangle Problems',a:'Bentley, J.L.',y:1977,v:'CMU Technical Report',u:'https://en.wikipedia.org/wiki/Segment_tree'},
      {t:'A New Data Structure for Cumulative Frequency Tables',a:'Fenwick, P.M.',y:1994,v:'Software: Practice and Experience',u:'https://doi.org/10.1002/spe.4380240306'},
      {t:'Making Data Structures Persistent',a:'Driscoll, J.R. et al.',y:1989,v:'JCSS',u:'https://doi.org/10.1016/0022-0000(89)90034-2'}
    ],
    'disjoint-set': [
      {t:'Efficiency of a Good but Not Linear Set Union Algorithm',a:'Tarjan, R.E.',y:1975,v:'JACM',u:'https://doi.org/10.1145/321879.321884'},
      {t:'Worst-Case Analysis of Set Union Algorithms',a:'Tarjan, R.E. & van Leeuwen, J.',y:1984,v:'JACM',u:'https://doi.org/10.1145/62.2160'},
      {t:'A Randomized Linear-Time Algorithm for Finding MSTs',a:'Karger, D.R., Klein, P.N. & Tarjan, R.E.',y:1995,v:'JACM',u:'https://doi.org/10.1145/201019.201022'}
    ],
    'string-algorithms': [
      {t:'Fast Pattern Matching in Strings (KMP)',a:'Knuth, D.E., Morris, J.H. & Pratt, V.R.',y:1977,v:'SIAM Journal on Computing',u:'https://doi.org/10.1137/0206024'},
      {t:'Efficient String Matching (Aho-Corasick)',a:'Aho, A.V. & Corasick, M.J.',y:1975,v:'Communications of the ACM',u:'https://doi.org/10.1145/360825.360855'},
      {t:'Suffix Arrays: A New Method for On-Line String Searches',a:'Manber, U. & Myers, G.',y:1993,v:'SIAM Journal on Computing',u:'https://doi.org/10.1137/0222058'}
    ],
    'tries': [
      {t:'Trie Memory',a:'Fredkin, E.',y:1960,v:'Communications of the ACM',u:'https://doi.org/10.1145/367390.367400'},
      {t:'PATRICIA: Practical Algorithm To Retrieve Information Coded in Alphanumeric',a:'Morrison, D.R.',y:1968,v:'JACM',u:'https://doi.org/10.1145/321479.321481'},
      {t:'Fast Algorithms for Sorting and Searching Strings',a:'Bentley, J.L. & Sedgewick, R.',y:1997,v:'SODA',u:'https://doi.org/10.1145/267651.267658'}
    ],
    'game-theory': [
      {t:'Uber Mathematische Kampfspiele (Sprague-Grundy)',a:'Sprague, R.P.',y:1935,v:'Tohoku Mathematical Journal',u:'https://en.wikipedia.org/wiki/Sprague%E2%80%93Grundy_theorem'},
      {t:'Mathematics and Games',a:'Grundy, P.M.',y:1939,v:'Eureka',u:'https://en.wikipedia.org/wiki/Sprague%E2%80%93Grundy_theorem'},
      {t:'Winning Ways for Your Mathematical Plays',a:'Berlekamp, Conway, Guy',y:1982,v:'Academic Press',u:'https://en.wikipedia.org/wiki/Winning_Ways_for_your_Mathematical_Plays'}
    ],
    'geometry': [
      {t:'An Efficient Algorithm for Determining the Convex Hull',a:'Graham, R.L.',y:1972,v:'Information Processing Letters',u:'https://doi.org/10.1016/0020-0190(72)90045-2'},
      {t:'Closest-Point Problems',a:'Shamos, M.I. & Hoey, D.',y:1975,v:'FOCS',u:'https://doi.org/10.1109/SFCS.1975.8'},
      {t:'Computational Geometry: An Introduction',a:'Preparata, F.P. & Shamos, M.I.',y:1985,v:'Springer',u:'https://doi.org/10.1007/978-1-4612-1098-6'}
    ],
    'linear-algebra-ml': [
      {t:'Linear Algebra and Its Applications',a:'Strang, G.',y:2006,v:'Cengage Learning, 4th Edition',u:'https://math.mit.edu/~gs/linearalgebra/'},
      {t:'Matrix Computations',a:'Golub, G.H. & Van Loan, C.F.',y:2013,v:'Johns Hopkins University Press',u:'https://doi.org/10.56021/9781421407944'},
      {t:'Mathematics for Machine Learning',a:'Deisenroth, M.P., Faisal, A.A. & Ong, C.S.',y:2020,v:'Cambridge University Press',u:'https://mml-book.github.io/'}
    ],
    'probability-stats': [
      {t:'An Essay Towards Solving a Problem in the Doctrine of Chances',a:'Bayes, T.',y:1763,v:'Philosophical Transactions',u:'https://doi.org/10.1098/rstl.1763.0053'},
      {t:'Statistical Methods for Research Workers',a:'Fisher, R.A.',y:1925,v:'Oliver and Boyd',u:'https://en.wikipedia.org/wiki/Statistical_Methods_for_Research_Workers'},
      {t:'All of Statistics: A Concise Course in Statistical Inference',a:'Wasserman, L.',y:2004,v:'Springer',u:'https://doi.org/10.1007/978-0-387-21736-9'}
    ],
    'data-preprocessing': [
      {t:'Feature Engineering for Machine Learning',a:'Zheng, A. & Casari, A.',y:2018,v:'O Reilly Media',u:'https://www.oreilly.com/library/view/feature-engineering-for/9781491953235/'},
      {t:'A Survey on Data Preprocessing for Data Stream Mining',a:'Ramirez-Gallego, S. et al.',y:2017,v:'Neurocomputing',u:'https://doi.org/10.1016/j.neucom.2017.01.078'},
      {t:'Data Mining: Practical ML Tools and Techniques',a:'Witten, I.H., Frank, E. & Hall, M.A.',y:2016,v:'Morgan Kaufmann',u:'https://doi.org/10.1016/C2009-0-19715-5'}
    ],
    'supervised-learning': [
      {t:'A Training Algorithm for Optimal Margin Classifiers (SVM)',a:'Boser, B.E., Guyon, I.M. & Vapnik, V.N.',y:1992,v:'COLT',u:'https://doi.org/10.1145/130385.130401'},
      {t:'The Nature of Statistical Learning Theory',a:'Vapnik, V.',y:1995,v:'Springer',u:'https://doi.org/10.1007/978-1-4757-3264-1'},
      {t:'Random Forests',a:'Breiman, L.',y:2001,v:'Machine Learning',u:'https://doi.org/10.1023/A:1010933404324'}
    ],
    'unsupervised-learning': [
      {t:'Least Squares Quantization in PCM (k-Means)',a:'Lloyd, S.P.',y:1982,v:'IEEE Trans. Information Theory',u:'https://doi.org/10.1109/TIT.1982.1056489'},
      {t:'On Lines and Planes of Closest Fit (PCA)',a:'Pearson, K.',y:1901,v:'Philosophical Magazine',u:'https://doi.org/10.1080/14786440109462720'},
      {t:'DBSCAN: A Density-Based Algorithm for Discovering Clusters',a:'Ester, M. et al.',y:1996,v:'KDD',u:'https://www.aaai.org/Papers/KDD/1996/KDD96-037.pdf'}
    ],
    'ensemble-methods': [
      {t:'A Decision-Theoretic Generalization of On-Line Learning (AdaBoost)',a:'Freund, Y. & Schapire, R.E.',y:1997,v:'JCSS',u:'https://doi.org/10.1006/jcss.1997.1504'},
      {t:'XGBoost: A Scalable Tree Boosting System',a:'Chen, T. & Guestrin, C.',y:2016,v:'KDD',u:'https://doi.org/10.1145/2939672.2939785'},
      {t:'Greedy Function Approximation: A Gradient Boosting Machine',a:'Friedman, J.H.',y:2001,v:'Annals of Statistics',u:'https://doi.org/10.1214/aos/1013203451'}
    ],
    'deep-learning-fundamentals': [
      {t:'Learning Representations by Back-Propagating Errors',a:'Rumelhart, D.E., Hinton, G.E. & Williams, R.J.',y:1986,v:'Nature',u:'https://doi.org/10.1038/323533a0'},
      {t:'Deep Learning',a:'LeCun, Y., Bengio, Y. & Hinton, G.',y:2015,v:'Nature',u:'https://doi.org/10.1038/nature14539'},
      {t:'Adam: A Method for Stochastic Optimization',a:'Kingma, D.P. & Ba, J.',y:2015,v:'ICLR',u:'https://arxiv.org/abs/1412.6980'}
    ],
    'cnns': [
      {t:'Gradient-Based Learning Applied to Document Recognition (LeNet)',a:'LeCun, Y. et al.',y:1998,v:'Proceedings of the IEEE',u:'https://doi.org/10.1109/5.726791'},
      {t:'Deep Residual Learning for Image Recognition (ResNet)',a:'He, K. et al.',y:2016,v:'CVPR',u:'https://arxiv.org/abs/1512.03385'},
      {t:'ImageNet Classification with Deep CNNs (AlexNet)',a:'Krizhevsky, A., Sutskever, I. & Hinton, G.E.',y:2012,v:'NeurIPS',u:'https://doi.org/10.1145/3065386'}
    ],
    'nlp': [
      {t:'Attention Is All You Need (Transformer)',a:'Vaswani, A. et al.',y:2017,v:'NeurIPS',u:'https://arxiv.org/abs/1706.03762'},
      {t:'BERT: Pre-training of Deep Bidirectional Transformers',a:'Devlin, J. et al.',y:2019,v:'NAACL',u:'https://arxiv.org/abs/1810.04805'},
      {t:'Efficient Estimation of Word Representations in Vector Space (Word2Vec)',a:'Mikolov, T. et al.',y:2013,v:'ICLR Workshop',u:'https://arxiv.org/abs/1301.3781'}
    ],
    'reinforcement-learning': [
      {t:'Playing Atari with Deep Reinforcement Learning (DQN)',a:'Mnih, V. et al.',y:2013,v:'NeurIPS Workshop',u:'https://arxiv.org/abs/1312.5602'},
      {t:'Proximal Policy Optimization Algorithms (PPO)',a:'Schulman, J. et al.',y:2017,v:'arXiv',u:'https://arxiv.org/abs/1707.06347'},
      {t:'Reinforcement Learning: An Introduction',a:'Sutton, R.S. & Barto, A.G.',y:2018,v:'MIT Press, 2nd Edition',u:'http://incompleteideas.net/book/the-book-2nd.html'}
    ],
    'generative-ai': [
      {t:'Generative Adversarial Networks (GANs)',a:'Goodfellow, I.J. et al.',y:2014,v:'NeurIPS',u:'https://arxiv.org/abs/1406.2661'},
      {t:'Language Models are Few-Shot Learners (GPT-3)',a:'Brown, T.B. et al.',y:2020,v:'NeurIPS',u:'https://arxiv.org/abs/2005.14165'},
      {t:'Denoising Diffusion Probabilistic Models',a:'Ho, J., Jain, A. & Abbeel, P.',y:2020,v:'NeurIPS',u:'https://arxiv.org/abs/2006.11239'}
    ],
    'model-deployment': [
      {t:'Hidden Technical Debt in Machine Learning Systems',a:'Sculley, D. et al.',y:2015,v:'NeurIPS',u:'https://papers.nips.cc/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html'},
      {t:'TFX: A TensorFlow-Based Production-Scale ML Platform',a:'Baylor, D. et al.',y:2017,v:'KDD',u:'https://doi.org/10.1145/3097983.3098021'},
      {t:'Challenges in Deploying Machine Learning: A Survey',a:'Paleyes, A., Urma, R. & Lawrence, N.D.',y:2022,v:'ACM Computing Surveys',u:'https://doi.org/10.1145/3533378'}
    ],
    'ethics-ai': [
      {t:'Gender Shades: Intersectional Accuracy Disparities',a:'Buolamwini, J. & Gebru, T.',y:2018,v:'FAT*',u:'https://proceedings.mlr.press/v81/buolamwini18a.html'},
      {t:'Model Cards for Model Reporting',a:'Mitchell, M. et al.',y:2019,v:'FAT*',u:'https://doi.org/10.1145/3287560.3287596'},
      {t:'A Unified Approach to Interpreting Model Predictions (SHAP)',a:'Lundberg, S.M. & Lee, S.I.',y:2017,v:'NeurIPS',u:'https://arxiv.org/abs/1705.07874'}
    ]
  },

  async renderLearn(el) {
    const stats = await API.getTutorialStats();
    let statsHtml = '';
    if (stats.ok) {
      const pct = stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0;
      statsHtml = `
        <div class="learn-stats-bar">
          <div class="learn-stat-item"><i class="icon-book"></i><span>${stats.total} Topics</span></div>
          <div class="learn-stat-item"><i class="icon-check"></i><span>${stats.completed} Completed</span></div>
          <div class="learn-progress-bar">
            <div class="learn-progress-fill" style="width:${pct}%"></div>
            <span class="learn-progress-text">${pct}% Complete</span>
          </div>
        </div>`;
    }

    const gateSubjects = this._learnSubjects.filter(s => s.gate);
    const coreSubjects = this._learnSubjects.filter(s => !s.gate && !s.other && !s.lang && !s.sysdesign && !s.aiml);
    const otherSubjects = this._learnSubjects.filter(s => s.other);
    const langSubjects = this._learnSubjects.filter(s => s.lang);
    const sysdesignSubjects = this._learnSubjects.filter(s => s.sysdesign);
    const aimlSubjects = this._learnSubjects.filter(s => s.aiml);

    const cardHtml = (s, i) => `
      <div class="learn-subject-card" onclick="location.hash='#/learn/${s.id}'" style="animation-delay:${i * 0.07}s">
        <div class="learn-subject-visual lv-${s.anim}">
          <div class="learn-card-icon-wrap">
            <i class="icon-${s.icon} learn-card-icon" style="color:${s.color}"></i>
          </div>
        </div>
        <div class="learn-subject-body">
          <h3 class="learn-subject-name">${s.name}</h3>
          <p class="learn-subject-desc">${s.desc}</p>
          ${s.gate ? '<span class="learn-subject-badge">GATE</span>' : ''}
        </div>
        <div class="learn-subject-arrow"><i class="icon-chevron-right"></i></div>
      </div>`;

    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-learn" style="font-size:28px"></i> <span class="glitch" data-text="Learn">Learn</span></h1>
        <p>git clone knowledge.git && make install # step_by_step</p>
      </div>
      ${statsHtml}
      <h2 class="learn-section-title"><i class="icon-spark"></i> Data Structures & Algorithms</h2>
      <div class="learn-subjects-grid">
        ${coreSubjects.map((s, i) => cardHtml(s, i)).join('')}
      </div>
      <h2 class="learn-section-title"><i class="icon-brain"></i> AI & Machine Learning</h2>
      <div class="learn-subjects-grid">
        ${aimlSubjects.map((s, i) => cardHtml(s, i)).join('')}
      </div>
      <h2 class="learn-section-title"><i class="icon-shield"></i> GATE Computer Science</h2>
      <div class="learn-subjects-grid">
        ${gateSubjects.map((s, i) => cardHtml(s, i)).join('')}
      </div>
      <h2 class="learn-section-title"><i class="icon-code"></i> Programming Languages</h2>
      <div class="learn-subjects-grid">
        ${langSubjects.map((s, i) => cardHtml(s, i)).join('')}
      </div>
      <h2 class="learn-section-title"><i class="icon-layers"></i> System Design</h2>
      <div class="learn-subjects-grid">
        ${sysdesignSubjects.map((s, i) => cardHtml(s, i)).join('')}
      </div>
      <h2 class="learn-section-title"><i class="icon-book"></i> Explore More</h2>
      <div class="learn-subjects-grid">
        ${otherSubjects.map((s, i) => cardHtml(s, i)).join('')}
      </div>`;
  },

  async renderLearnTopics(el) {
    const subjectDef = this._learnSubjects.find(s => s.id === this._learnSubject);
    if (!subjectDef) { location.hash = '#/learn'; return; }

    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-${subjectDef.icon}" style="font-size:28px;color:${subjectDef.color}"></i> <span class="glitch" data-text="${subjectDef.name}">${subjectDef.name}</span></h1>
        <p>${subjectDef.desc}</p>
      </div>
      <div style="margin-bottom:20px">
        <a href="#/learn" class="fp-back-btn"><i class="icon-back"></i> Back to Subjects</a>
      </div>
      <div id="learnStats"></div>
      <div id="learnGrid" class="learn-grid"></div>`;

    // Fetch all tutorials and filter by subject
    const data = await API.getTutorials('all');
    if (!data.ok) return;

    let tutorials = data.tutorials.filter(t => {
      if (subjectDef.topics) {
        return subjectDef.topics.includes(t.topic);
      }
      return subjectDef.categories.includes(t.category);
    });

    // Stats for this subject
    const total = tutorials.length;
    const completed = tutorials.filter(t => t.completed).length;
    const pct = total > 0 ? Math.round(completed / total * 100) : 0;
    document.getElementById('learnStats').innerHTML = `
      <div class="learn-stats-bar">
        <div class="learn-stat-item"><i class="icon-book"></i><span>${total} Topics</span></div>
        <div class="learn-stat-item"><i class="icon-check"></i><span>${completed} Completed</span></div>
        <div class="learn-progress-bar">
          <div class="learn-progress-fill" style="width:${pct}%"></div>
          <span class="learn-progress-text">${pct}% Complete</span>
        </div>
      </div>`;

    const grid = document.getElementById('learnGrid');
    if (!tutorials.length) {
      grid.innerHTML = '<div class="empty-state"><p>// 404: no tutorials in this module</p></div>';
      return;
    }

    const catLabels = { cp: 'DSA', ai: 'AI & ML', cv: 'Computer Vision', nlpcat: 'NLP', os: 'Operating Systems', dbms: 'DBMS', cn: 'Networks', toc: 'Theory of Computation', cd: 'Compiler Design', coa: 'Computer Org.', digital: 'Digital Logic', discrete: 'Discrete Math', math: 'Engineering Math', se: 'Software Eng.', oop: 'OOP', web: 'Web Tech', security: 'Cyber Security', cloud: 'Cloud Computing', graphics: 'Computer Graphics', distributed: 'Distributed Systems', datascience: 'Data Science', parallel: 'Parallel Computing', iot: 'IoT', blockchain: 'Blockchain', embedded: 'Embedded Systems', hci: 'HCI', ir: 'Information Retrieval', numerical: 'Numerical Methods', bigdata: 'Big Data', clang: 'C', cpp: 'C++', java: 'Java', python: 'Python', javascript: 'JavaScript', golang: 'Go', rust: 'Rust', typescript: 'TypeScript', sysdesign: 'System Design' };
    const diffColors = { beginner: 'green', intermediate: 'blue', advanced: 'red' };
    const topicIcons = {
      'complexity': 'clock', 'arrays': 'hash', 'sorting': 'chart', 'binary-search': 'search',
      'stacks-queues': 'layers', 'hashing': 'key', 'linked-lists': 'link', 'heaps': 'pyramid',
      'dynamic-programming': 'puzzle', 'graphs': 'graph', 'greedy': 'bolt', 'trees': 'tree',
      'number-theory': 'infinity', 'bit-manipulation': 'cpu',
      'segment-trees': 'layers', 'disjoint-set': 'link', 'string-algorithms': 'text',
      'tries': 'tree', 'game-theory': 'gamepad', 'geometry': 'compass',
      'linear-algebra-ml': 'grid', 'probability-stats': 'chart', 'data-preprocessing': 'filter',
      'supervised-learning': 'target', 'unsupervised-learning': 'cluster',
      'ensemble-methods': 'trees', 'deep-learning-fundamentals': 'neural',
      'cnns': 'eye', 'nlp': 'text', 'reinforcement-learning': 'gamepad',
      'generative-ai': 'spark', 'model-deployment': 'rocket', 'ethics-ai': 'shield',
      'ml-fundamentals': 'chart', 'deep-learning': 'neural', 'computer-vision': 'eye'
    };

    grid.innerHTML = tutorials.map((t, i) => `
      <div class="learn-card ${t.completed ? 'completed' : ''}" onclick="location.hash='#/learn/${this._learnSubject}/${t.id}'" style="animation-delay:${i * 0.06}s">
        <div class="learn-card-visual lv-${this._topicAnim[t.topic] || subjectDef.anim || 'bars'}">
          <div class="learn-card-icon-wrap">
            <i class="icon-${topicIcons[t.topic] || subjectDef.icon || 'book'} learn-card-icon"></i>
            ${t.completed ? '<div class="learn-card-check"><i class="icon-check"></i></div>' : ''}
          </div>
        </div>
        <div class="learn-card-body">
          <span class="learn-card-cat">${catLabels[t.category] || t.category}</span>
          <h3 class="learn-card-title">${this._esc(t.title)}</h3>
          <p class="learn-card-desc">${this._esc(t.description)}</p>
          <div class="learn-card-meta">
            <span class="learn-diff ${diffColors[t.difficulty] || ''}">${t.difficulty}</span>
            <span class="learn-time"><i class="icon-clock"></i> ${t.estimated_time}</span>
          </div>
        </div>
      </div>`).join('');
  },

  async openTutorial(id) {
    // Try to find which subject this tutorial belongs to
    const data = await API.getTutorial(id);
    if (data.ok) {
      const t = data.tutorial;
      const sub = this._learnSubjects.find(s => {
        if (s.topics) return s.topics.includes(t.topic);
        return s.categories.includes(t.category);
      });
      if (sub) { location.hash = '#/learn/' + sub.id + '/' + id; return; }
    }
    location.hash = '#/learn/dsa/' + id;
  },

  async _openTutorialPage(el, id) {
    const data = await API.getTutorial(id);
    if (!data.ok) { location.hash = '#/learn'; return; }
    const t = data.tutorial;
    const examples = JSON.parse(t.code_examples || '[]');
    const papers = this._topicPapers[t.topic] || [];

    // Find subject for back navigation
    const subjectDef = this._learnSubjects.find(s => {
      if (s.topics) return s.topics.includes(t.topic);
      return s.categories.includes(t.category);
    });
    const backHash = subjectDef ? '#/learn/' + subjectDef.id : '#/learn';
    const subjectName = subjectDef ? subjectDef.name : 'Learn';

    const topicIcons = {
      'complexity': 'clock', 'arrays': 'hash', 'sorting': 'chart', 'binary-search': 'search',
      'stacks-queues': 'layers', 'hashing': 'key', 'linked-lists': 'link', 'heaps': 'pyramid',
      'dynamic-programming': 'puzzle', 'graphs': 'graph', 'greedy': 'bolt', 'trees': 'tree',
      'number-theory': 'infinity', 'bit-manipulation': 'cpu',
      'segment-trees': 'layers', 'disjoint-set': 'link', 'string-algorithms': 'text',
      'tries': 'tree', 'game-theory': 'gamepad', 'geometry': 'compass',
      'linear-algebra-ml': 'grid', 'probability-stats': 'chart', 'data-preprocessing': 'filter',
      'supervised-learning': 'target', 'unsupervised-learning': 'cluster',
      'ensemble-methods': 'trees', 'deep-learning-fundamentals': 'neural',
      'cnns': 'eye', 'nlp': 'text', 'reinforcement-learning': 'gamepad',
      'generative-ai': 'spark', 'model-deployment': 'rocket', 'ethics-ai': 'shield',
    };
    const catLabels = { cp: 'DSA', ai: 'AI & ML', cv: 'Computer Vision', nlpcat: 'NLP', os: 'Operating Systems', dbms: 'DBMS', cn: 'Networks', toc: 'Theory of Computation', cd: 'Compiler Design', coa: 'Computer Org.', digital: 'Digital Logic', discrete: 'Discrete Math', math: 'Engineering Math', se: 'Software Eng.', oop: 'OOP', web: 'Web Tech', security: 'Cyber Security', cloud: 'Cloud Computing', graphics: 'Computer Graphics', distributed: 'Distributed Systems', datascience: 'Data Science', parallel: 'Parallel Computing', iot: 'IoT', blockchain: 'Blockchain', embedded: 'Embedded Systems', hci: 'HCI', ir: 'Information Retrieval', numerical: 'Numerical Methods', bigdata: 'Big Data', clang: 'C', cpp: 'C++', java: 'Java', python: 'Python', javascript: 'JavaScript', golang: 'Go', rust: 'Rust', typescript: 'TypeScript', sysdesign: 'System Design' };
    const vis = this._topicAnim[t.topic] || 'bars';
    const topicIcon = topicIcons[t.topic] || 'book';

    el.innerHTML = `
      <div class="fp-tutorial">
        <div class="fp-topbar">
          <a href="${backHash}" class="fp-back-btn"><i class="icon-back"></i> Back to ${subjectName}</a>
          <div class="fp-breadcrumb">
            <a href="#/learn" class="fp-bc-link"><i class="icon-learn"></i> Learn</a>
            <i class="icon-chevron-right fp-bc-sep"></i>
            <a href="${backHash}" class="fp-bc-link">${subjectName}</a>
            <i class="icon-chevron-right fp-bc-sep"></i>
            <span class="fp-bc-current">${this._esc(t.title)}</span>
          </div>
        </div>

        <div class="fp-hero">
          <div class="fp-hero-visual lv-${vis}">
            <div class="fp-hero-icon-wrap">
              <i class="icon-${topicIcon} fp-hero-icon"></i>
            </div>
          </div>
          <div class="fp-hero-info">
            <div class="fp-hero-badges">
              <span class="fp-badge-cat">${catLabels[t.category] || t.category}</span>
              <span class="learn-diff ${t.difficulty}">${t.difficulty}</span>
              <span class="learn-time"><i class="icon-clock"></i> ${t.estimated_time}</span>
              ${t.completed ? '<span class="fp-badge-done"><i class="icon-check"></i> Completed</span>' : ''}
            </div>
            <h1 class="fp-hero-title"><span class="glitch" data-text="${this._esc(t.title)}">${this._esc(t.title)}</span></h1>
            <p class="fp-hero-desc">${this._esc(t.description)}</p>
          </div>
        </div>

        <div class="fp-body">
          <div class="fp-main">
            <div class="fp-content-card">
              <div class="tutorial-content">${t.content}</div>
            </div>

            ${papers.length ? `
            <div class="fp-section">
              <h3 class="fp-section-title"><i class="icon-external"></i> Key Research Papers</h3>
              <div class="fp-papers">
                ${papers.map(p => `<a href="${p.u}" target="_blank" rel="noopener noreferrer" class="fp-paper">
                  <div class="fp-paper-main">
                    <span class="fp-paper-title">${p.t}</span>
                    <span class="fp-paper-meta">${p.a} (${p.y}) — ${p.v}</span>
                  </div>
                  <i class="icon-external fp-paper-arrow"></i>
                </a>`).join('')}
              </div>
            </div>` : ''}

            ${examples.length ? `
            <div class="fp-section">
              <h3 class="fp-section-title"><i class="icon-tags"></i> Topics Covered</h3>
              <div class="fp-topic-tags">${examples.map(e => `<span class="fp-topic-tag">${this._esc(e)}</span>`).join('')}</div>
            </div>` : ''}
          </div>
        </div>

        <div class="fp-practice-section">
          <div class="fp-practice-section-header">
            <div class="fp-practice-icon-wrap"><i class="icon-fire"></i></div>
            <div>
              <h3 class="fp-section-title" style="margin-bottom:2px"><i class="icon-fire" style="display:none"></i> Practice Problems</h3>
              <p class="fp-sidebar-desc">Solve curated problems to reinforce what you learned</p>
            </div>
            <div class="fp-practice-stats-inline" id="tutorialProblemStats"></div>
          </div>
          <div id="tutorialProblemsGrid" class="fp-problems-grid">
            <div class="loader"><div class="loader-ring"></div><div class="loader-dots"><span></span><span></span><span></span></div></div>
          </div>
        </div>
      </div>`;

    // Scroll to top
    document.getElementById('mainContent').scrollTop = 0;

    // Fetch related problems asynchronously
    this._loadTutorialProblems(t.topic);
  },

  async _loadTutorialProblems(topic) {
    const grid = document.getElementById('tutorialProblemsGrid');
    if (!grid) return;
    try {
      const data = await API.getTutorialProblems(topic);
      if (!data.ok || !data.problems.length) {
        grid.innerHTML = '<p class="text-muted" style="text-align:center;padding:16px">No practice problems found for this topic yet.</p>';
        return;
      }
      const solved = data.problems.filter(p => p.solve_status === 'solved').length;
      const attempted = data.problems.filter(p => p.solve_status === 'attempted').length;
      const total = data.problems.length;
      const pct = total ? Math.round((solved / total) * 100) : 0;
      const statsEl = document.getElementById('tutorialProblemStats');
      if (statsEl) {
        statsEl.innerHTML = `
          <span class="fp-pstat"><span class="fp-pstat-num fp-pstat-solved">${solved}</span>/${total} solved</span>
          <div class="fp-pstats-bar-inline"><div class="fp-pstats-fill" style="width:${pct}%"></div></div>`;
      }
      grid.innerHTML = data.problems.map((p, i) => {
        const statusCls = p.solve_status === 'solved' ? 'tp-solved' : p.solve_status === 'attempted' ? 'tp-attempted' : '';
        const statusDot = p.solve_status === 'solved' ? '<span class="tp-dot tp-dot-solved"></span>' : p.solve_status === 'attempted' ? '<span class="tp-dot tp-dot-attempted"></span>' : '<span class="tp-dot"></span>';
        const ratingColor = p.rating <= 1200 ? '#22c55e' : p.rating <= 1600 ? '#3b82f6' : p.rating <= 2000 ? '#059669' : p.rating <= 2400 ? '#f59e0b' : '#ef4444';
        const diffLabel = p.rating <= 1200 ? 'Easy' : p.rating <= 1600 ? 'Medium' : p.rating <= 2000 ? 'Hard' : 'Expert';
        const platShort = p.platform === 'codeforces' ? 'CF' : p.platform === 'codechef' ? 'CC' : 'AC';
        return `
          <div class="tp-card ${statusCls}" onclick="App.openSolve(${p.id})" style="animation-delay:${i * 0.04}s">
            ${statusDot}
            <div class="tp-card-body">
              <div class="tp-title">${this._esc(p.title)}</div>
              <div class="tp-meta">${platShort} <span class="tp-sep">&bull;</span> <span style="color:${ratingColor}">${p.rating}</span> <span class="tp-sep">&bull;</span> ${diffLabel}</div>
            </div>
          </div>`;
      }).join('');
    } catch {
      grid.innerHTML = '<p class="text-muted" style="text-align:center;padding:16px">Failed to load problems.</p>';
    }
  },

  async _completeTutorial(id) {
    await API.completeTutorial(id);
    this.toast('[complete] tutorial mastered ✔', 'success');
    location.hash = '#/learn';
  },

  /* ===================================================
     THE FORGE — Software Development Roadmap
     =================================================== */
  _forgePathIcons: {
    'frontend': 'globe', 'backend': 'terminal', 'devops': 'rocket', 'system-design': 'graph',
    'mobile': 'cpu', 'data-engineering': 'dataset', 'security': 'shield', 'software-eng': 'wrench'
  },

  async renderForge(el) {
    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-hammer" style="font-size:28px"></i> <span class="glitch" data-text="The Forge">The Forge</span></h1>
        <p>make build && ./forge --craft=skills --level=master</p>
      </div>
      <div id="forgeStats"></div>
      <div id="forgeGrid" class="forge-grid">
        <div class="loader"><div class="loader-ring"></div><div class="loader-dots"><span></span><span></span><span></span></div></div>
      </div>`;

    const [statsData, data] = await Promise.all([API.getForgeStats(), API.getForgePaths()]);

    // Stats bar
    if (statsData.ok) {
      const pct = statsData.total > 0 ? Math.round(statsData.completed / statsData.total * 100) : 0;
      document.getElementById('forgeStats').innerHTML = `
        <div class="learn-stats-bar">
          <div class="learn-stat-item"><i class="icon-path"></i><span>${data.ok ? data.paths.length : 0} Paths</span></div>
          <div class="learn-stat-item"><i class="icon-puzzle"></i><span>${statsData.total} Topics</span></div>
          <div class="learn-stat-item"><i class="icon-check"></i><span>${statsData.completed} Completed</span></div>
          <div class="learn-stat-item"><i class="icon-bolt"></i><span>${statsData.inProgress} In Progress</span></div>
          <div class="learn-progress-bar">
            <div class="learn-progress-fill" style="width:${pct}%"></div>
            <span class="learn-progress-text">${pct}% Mastered</span>
          </div>
        </div>`;
    }

    if (!data.ok) { document.getElementById('forgeGrid').innerHTML = '<div class="empty-state"><p>// error: forge paths failed to load</p></div>'; return; }

    const grid = document.getElementById('forgeGrid');
    grid.innerHTML = data.paths.map((p, i) => {
      const icon = this._forgePathIcons[p.id] || 'code';
      return `
        <div class="forge-path-card" onclick="location.hash='#/forge/${p.id}'" style="animation-delay:${i * 0.08}s; --path-color: ${p.color}">
          <div class="forge-path-header">
            <div class="forge-path-icon-wrap" style="background:linear-gradient(135deg, ${p.color}33, ${p.color}11)">
              <i class="icon-${icon}" style="color:${p.color}; font-size:28px"></i>
            </div>
            <div class="forge-path-progress-ring">
              <svg viewBox="0 0 40 40" class="forge-ring-svg">
                <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
                <circle cx="20" cy="20" r="17" fill="none" stroke="${p.color}" stroke-width="3"
                  stroke-dasharray="${2 * Math.PI * 17}" stroke-dashoffset="${2 * Math.PI * 17 * (1 - p.progress / 100)}"
                  stroke-linecap="round" transform="rotate(-90 20 20)" style="transition:stroke-dashoffset 0.6s ease"/>
              </svg>
              <span class="forge-ring-text" style="color:${p.color}">${p.progress}%</span>
            </div>
          </div>
          <div class="forge-path-body">
            <h3 class="forge-path-title">${this._esc(p.title)}</h3>
            <p class="forge-path-desc">${this._esc(p.description)}</p>
            <div class="forge-path-meta">
              <span class="forge-meta-item"><i class="icon-flag-finish"></i> ${p.milestones.length} Milestones</span>
              <span class="forge-meta-item"><i class="icon-puzzle"></i> ${p.totalTopics} Topics</span>
              <span class="forge-meta-item" style="color:#22c55e"><i class="icon-check"></i> ${p.completedTopics}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  },

  async _openForgePath(el, pathId) {
    el.innerHTML = '<div class="loader"><div class="loader-ring"></div><div class="loader-dots"><span></span><span></span><span></span></div></div>';
    const data = await API.getForgePath(pathId);
    if (!data.ok) { location.hash = '#/forge'; return; }
    const p = data.path;
    const icon = this._forgePathIcons[p.id] || 'code';

    el.innerHTML = `
      <div class="fp-tutorial">
        <div class="fp-topbar">
          <a href="#/forge" class="fp-back-btn"><i class="icon-back"></i> Back to Forge</a>
          <div class="fp-breadcrumb">
            <a href="#/forge" class="fp-bc-link"><i class="icon-hammer"></i> The Forge</a>
            <i class="icon-chevron-right fp-bc-sep"></i>
            <span class="fp-bc-current">${this._esc(p.title)}</span>
          </div>
        </div>

        <div class="forge-detail-hero" style="--path-color: ${p.color}">
          <div class="forge-detail-icon" style="background:linear-gradient(135deg, ${p.color}33, ${p.color}11)">
            <i class="icon-${icon}" style="color:${p.color}; font-size:36px"></i>
          </div>
          <div class="forge-detail-info">
            <h1 class="forge-detail-title" style="color:${p.color}"><span class="glitch" data-text="${this._esc(p.title)}">${this._esc(p.title)}</span></h1>
            <p class="forge-detail-desc">${this._esc(p.description)}</p>
            <div class="forge-detail-stats">
              <span class="forge-detail-stat">${p.completedTopics}/${p.totalTopics} topics completed</span>
              <div class="forge-detail-bar"><div class="forge-detail-bar-fill" style="width:${p.progress}%;background:${p.color}"></div></div>
              <span class="forge-detail-pct" style="color:${p.color}">${p.progress}%</span>
            </div>
          </div>
        </div>

        <div class="forge-milestones" id="forgeMilestones">
          ${p.milestones.map((ms, mi) => {
            const msCompleted = ms.topics.filter(t => t.status === 'completed').length;
            const msPct = ms.topics.length > 0 ? Math.round(msCompleted / ms.topics.length * 100) : 0;
            return `
            <div class="forge-milestone">
              <div class="forge-ms-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="forge-ms-num" style="background:${p.color}">${mi + 1}</div>
                <div class="forge-ms-info">
                  <h3 class="forge-ms-title">${this._esc(ms.title)}</h3>
                  <div class="forge-ms-sub">${msCompleted}/${ms.topics.length} topics · ${msPct}% complete</div>
                </div>
                <div class="forge-ms-bar-wrap">
                  <div class="forge-ms-bar"><div class="forge-ms-bar-fill" style="width:${msPct}%;background:${p.color}"></div></div>
                </div>
                <i class="icon-chevron-down forge-ms-chevron"></i>
              </div>
              <div class="forge-ms-topics">
                ${ms.topics.map(t => {
                  const statusIcon = t.status === 'completed' ? '<i class="icon-check" style="color:#22c55e"></i>'
                    : t.status === 'in-progress' ? '<i class="icon-bolt" style="color:#f59e0b"></i>'
                    : '<div class="forge-topic-dot"></div>';
                  const statusCls = t.status === 'completed' ? 'forge-t-done' : t.status === 'in-progress' ? 'forge-t-active' : '';
                  const diffCls = t.difficulty === 'beginner' ? 'green' : t.difficulty === 'intermediate' ? 'blue' : 'red';
                  return `
                  <div class="forge-topic ${statusCls}">
                    <div class="forge-topic-status">${statusIcon}</div>
                    <div class="forge-topic-body">
                      <div class="forge-topic-title">${this._esc(t.title)}</div>
                      <div class="forge-topic-desc">${this._esc(t.desc)}</div>
                      <div class="forge-topic-meta">
                        <span class="learn-diff ${diffCls}">${t.difficulty}</span>
                        <span class="learn-time"><i class="icon-clock"></i> ${t.time}</span>
                      </div>
                    </div>
                    <div class="forge-topic-actions">
                      <select class="forge-status-select" onchange="App._setForgeTopicStatus('${t.id}','${p.id}',this.value)" title="Set status">
                        <option value="not-started" ${t.status === 'not-started' ? 'selected' : ''}>Not Started</option>
                        <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
                      </select>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;

    document.getElementById('mainContent').scrollTop = 0;
  },

  async _setForgeTopicStatus(topicId, pathId, status) {
    const res = await API.setForgeTopicStatus(topicId, status, pathId);
    if (res.ok) {
      const label = status === 'completed' ? 'Completed!' : status === 'in-progress' ? 'In Progress' : 'Reset';
      this.toast(label, status === 'completed' ? 'success' : 'info');
      // Refresh the path page
      this._openForgePath(document.getElementById('pageContent'), pathId);
    }
  },

  /* ===================================================
     WORKSHOP (Problem Creation)
     =================================================== */
  async renderWorkshop(el) {
    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-code" style="font-size:28px"></i> <span class="glitch" data-text="Workshop">Workshop</span></h1>
        <p>touch sandbox.cpp && g++ -O2 -o a.out sandbox.cpp</p>
      </div>
      <div class="flex gap-3 mb-3">
        <button class="btn btn-primary" onclick="App.showCreateProblem()"><i class="icon-plus" style="font-size:14px"></i> touch problem.cpp</button>
      </div>
      <div id="workshopCreateForm" class="hidden"></div>
      <div id="workshopList"></div>`;
    this._loadWorkshopList();
  },

  async _loadWorkshopList() {
    const el = document.getElementById('workshopList');
    const data = await API.getCustomProblems();
    if (!data.ok || !data.problems.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon" style="font-size:48px"><i class="icon-wrench"></i></div><h3>// workspace empty</h3><p>Run `touch problem.cpp` to create your first one</p></div>';
      return;
    }
    el.innerHTML = `<div class="card"><table class="problem-table"><thead><tr>
      <th>Title</th><th style="width:100px">Difficulty</th><th style="width:80px">Samples</th><th style="width:140px">Created</th><th style="width:160px"></th>
    </tr></thead><tbody>
      ${data.problems.map(p => `<tr>
        <td><span class="problem-title-link" onclick="App.openSolveCustom(${p.id})">${this._esc(p.title)}</span></td>
        <td>${this._ratingBadge(p.difficulty)}</td>
        <td class="text-muted">${JSON.parse(p.samples||'[]').length}</td>
        <td class="text-sm text-muted">${this._timeAgo(p.created_at)}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="App.openSolveCustom(${p.id})"><i class="icon-sword"></i> Solve</button>
          <button class="btn btn-ghost btn-sm" onclick="App.editCustomProblem(${p.id})"><i class="icon-edit"></i></button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="App.deleteCustomProblem(${p.id})"><i class="icon-trash"></i></button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
  },

  showCreateProblem(existing) {
    const form = document.getElementById('workshopCreateForm');
    const p = existing || {};
    const samples = existing ? JSON.parse(p.samples || '[]') : [{ input: '', output: '' }];
    form.classList.remove('hidden');
    form.innerHTML = `
      <div class="card mb-3">
        <div class="card-header"><span class="card-title">${existing ? 'vim' : 'touch'} problem</span></div>
        <div class="workshop-form">
          <div class="flex gap-3">
            <div style="flex:2"><label class="text-sm text-muted">Title</label>
              <input class="input full-width" id="wpTitle" value="${this._esc(p.title || '')}" placeholder="Problem title"></div>
            <div style="flex:1"><label class="text-sm text-muted">Difficulty</label>
              <input class="input full-width" id="wpDifficulty" type="number" value="${p.difficulty || 1000}" min="0" max="3500"></div>
          </div>
          <div class="mt-2"><label class="text-sm text-muted">Statement (HTML)</label>
            <textarea class="input full-width" id="wpStatement" rows="6" placeholder="Problem statement...">${this._esc(p.statement || '')}</textarea></div>
          <div class="flex gap-3 mt-2">
            <div style="flex:1"><label class="text-sm text-muted">Input Spec</label>
              <textarea class="input full-width" id="wpInputSpec" rows="3">${this._esc(p.input_spec || '')}</textarea></div>
            <div style="flex:1"><label class="text-sm text-muted">Output Spec</label>
              <textarea class="input full-width" id="wpOutputSpec" rows="3">${this._esc(p.output_spec || '')}</textarea></div>
          </div>
          <div class="flex gap-3 mt-2">
            <div style="flex:1"><label class="text-sm text-muted">Time Limit</label>
              <input class="input full-width" id="wpTimeLimit" value="${p.time_limit || '2 seconds'}"></div>
            <div style="flex:1"><label class="text-sm text-muted">Memory Limit</label>
              <input class="input full-width" id="wpMemLimit" value="${p.memory_limit || '256 MB'}"></div>
            <div style="flex:1"><label class="text-sm text-muted">Tags (comma-separated)</label>
              <input class="input full-width" id="wpTags" value="${(existing ? JSON.parse(p.tags||'[]') : []).join(', ')}"></div>
          </div>
          <div class="mt-2"><label class="text-sm text-muted">Sample Test Cases</label>
            <div id="wpSamples">${samples.map((s, i) => `
              <div class="tc-add-grid mt-2">
                <div><label class="text-sm text-muted">Input ${i+1}</label><textarea class="input full-width wp-sample-in" rows="2">${this._esc(s.input)}</textarea></div>
                <div><label class="text-sm text-muted">Output ${i+1}</label><textarea class="input full-width wp-sample-out" rows="2">${this._esc(s.output)}</textarea></div>
              </div>`).join('')}
            </div>
            <button class="btn btn-ghost btn-sm mt-2" onclick="App._addWpSample()"><i class="icon-plus" style="font-size:12px"></i> +sample</button>
          </div>
          <div class="flex gap-2 mt-3">
            <button class="btn btn-primary" onclick="App.saveCustomProblem(${existing ? p.id : 'null'})">${existing ? ':w' : 'touch'}</button>
            <button class="btn btn-ghost" onclick="document.getElementById('workshopCreateForm').classList.add('hidden')">:q</button>
          </div>
        </div>
      </div>`;
  },

  _addWpSample() {
    const container = document.getElementById('wpSamples');
    const idx = container.querySelectorAll('.tc-add-grid').length;
    const div = document.createElement('div');
    div.className = 'tc-add-grid mt-2';
    div.innerHTML = `<div><label class="text-sm text-muted">Input ${idx+1}</label><textarea class="input full-width wp-sample-in" rows="2"></textarea></div>
      <div><label class="text-sm text-muted">Output ${idx+1}</label><textarea class="input full-width wp-sample-out" rows="2"></textarea></div>`;
    container.appendChild(div);
  },

  async saveCustomProblem(id) {
    const title = document.getElementById('wpTitle').value.trim();
    if (!title) { this.toast('[error] title required', 'error'); return; }
    const ins = document.querySelectorAll('.wp-sample-in');
    const outs = document.querySelectorAll('.wp-sample-out');
    const samples = [];
    for (let i = 0; i < ins.length; i++) {
      if (ins[i].value.trim() || outs[i].value.trim()) samples.push({ input: ins[i].value, output: outs[i].value });
    }
    const data = {
      title,
      statement: document.getElementById('wpStatement').value,
      input_spec: document.getElementById('wpInputSpec').value,
      output_spec: document.getElementById('wpOutputSpec').value,
      difficulty: +document.getElementById('wpDifficulty').value || 1000,
      tags: document.getElementById('wpTags').value.split(',').map(t => t.trim()).filter(Boolean),
      samples,
      testcases: samples,
      time_limit: document.getElementById('wpTimeLimit').value,
      memory_limit: document.getElementById('wpMemLimit').value,
    };
    if (id) await API.updateCustomProblem(id, data);
    else await API.createCustomProblem(data);
    document.getElementById('workshopCreateForm').classList.add('hidden');
    this.toast(id ? '[save] problem updated' : '[touch] problem created', 'success');
    this._loadWorkshopList();
  },

  async editCustomProblem(id) {
    const data = await API.getCustomProblem(id);
    if (data.ok) this.showCreateProblem(data.problem);
  },

  async deleteCustomProblem(id) {
    if (!confirm('Delete this problem?')) return;
    await API.deleteCustomProblem(id);
    this.toast('[rm] problem deleted', 'success');
    this._loadWorkshopList();
  },

  async openSolveCustom(id) {
    const data = await API.getCustomProblem(id);
    if (!data.ok) return;
    const p = data.problem;
    const samples = JSON.parse(p.samples || '[]');
    const testcases = JSON.parse(p.testcases || '[]').map((tc, i) => ({
      id: i, label: 'Sample ' + (i + 1), input: tc.input, expected_output: tc.output
    }));

    this.currentProblem = { problem: { id: 'custom_' + p.id, title: p.title, rating: p.difficulty, platform: 'custom', tags: p.tags, url: '' }, testcases, submissions: [] };
    this.currentStatement = { ok: true, statement: p.statement, inputSpec: p.input_spec, outputSpec: p.output_spec, note: '', timeLimit: p.time_limit, memLimit: p.memory_limit, samples, platform: 'custom' };

    document.getElementById('solveProblemBadges').innerHTML = `
      <span class="badge" style="background:rgba(16,185,129,0.12);color:var(--success);font-size:10px">Custom</span>
      ${this._ratingBadge(p.difficulty)}
      <span style="font-weight:600;color:var(--text-bright);font-size:13px">${this._esc(p.title)}</span>`;
    document.getElementById('solveExternalLink').href = '#';
    document.getElementById('solveOverlay').classList.remove('hidden');
    this.switchSolveTab('description');
    this.switchBottomTab('testcases');

    const descEl = document.getElementById('solveDescriptionContent');
    let html = '<div class="problem-statement-wrap">';
    html += `<h2>${this._esc(p.title)}</h2>`;
    html += '<div class="problem-meta-bar">';
    if (p.time_limit) html += `<div class="meta-chip"><i class="icon-clock" style="font-size:13px"></i> ${this._esc(p.time_limit)}</div>`;
    if (p.memory_limit) html += `<div class="meta-chip"><i class="icon-memory" style="font-size:13px"></i> ${this._esc(p.memory_limit)}</div>`;
    html += `<div class="meta-chip" style="color:var(--success)">Custom Problem</div>`;
    html += `<div class="meta-chip">${this._ratingBadge(p.difficulty)}</div>`;
    html += '</div>';
    html += '<div class="problem-body">';
    html += p.statement || '';
    if (p.input_spec) html += '<h3>Input</h3>' + p.input_spec;
    if (p.output_spec) html += '<h3>Output</h3>' + p.output_spec;
    html += '</div>';
    if (samples.length) {
      html += '<div class="sample-tests-section"><h3 style="font-size:15px;font-weight:700;color:var(--text-bright);margin-bottom:10px">Examples</h3>';
      samples.forEach((s, i) => {
        html += `<div class="sample-test-card"><div class="sample-test-header"><span>Example ${i+1}</span></div>
          <div class="sample-test-body">
            <div class="sample-col"><div class="sample-col-label">Input</div><pre>${this._esc(s.input)}</pre></div>
            <div class="sample-col"><div class="sample-col-label">Output</div><pre>${this._esc(s.output)}</pre></div>
          </div></div>`;
      });
      html += '</div>';
    }
    html += '</div>';
    descEl.innerHTML = html;
    this._renderBottomTestcases(testcases);

    document.getElementById('bottomResultsContent').innerHTML = '<div class="output-placeholder"><i class="icon-terminal" style="font-size:24px;opacity:0.3"></i><p>Run or submit your code to see results</p></div>';
    await window.monacoReady;
    if (!this.editor) {
      this.editor = monaco.editor.create(document.getElementById('monacoEditor'), {
        value: this._defaultCode(), language: this._monacoLangMap[this._currentLang] || 'cpp', theme: 'vs-dark',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 14,
        minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 },
        automaticLayout: true, tabSize: 4, bracketPairColorization: { enabled: true },
      });
    }

    // Start recording for code replay
    this._startRecording();
  },

  /* ===================================================
     SOLVE OVERLAY
     =================================================== */
  async openSolve(problemId) {
    const data = await API.getProblem(problemId);
    if (!data.ok) return;
    this.currentProblem = data;
    this.currentStatement = null;
    const p = data.problem;

    // Top bar badges
    const badges = document.getElementById('solveProblemBadges');
    badges.innerHTML = `
      <span class="badge ${p.platform === 'codeforces' ? 'badge-cf' : 'badge-cc'}" style="font-size:10px">${p.platform === 'codeforces' ? 'CF' : 'CC'}</span>
      ${this._ratingBadge(p.rating)}
      <span style="font-weight:600;color:var(--text-bright);font-size:13px">${this._esc(p.problem_id)} \u00b7 ${this._esc(p.title)}</span>`;

    // External link
    document.getElementById('solveExternalLink').href = p.url || '#';

    // Show overlay
    document.getElementById('solveOverlay').classList.remove('hidden');

    // Reset tabs to description + testcases
    this.switchSolveTab('description');
    this.switchBottomTab('testcases');

    // Load statement into the description content div
    this._loadStatement(p);

    // Render testcases in bottom panel
    this._renderBottomTestcases(data.testcases);

    // Clear results
    document.getElementById('bottomResultsContent').innerHTML = `
      <div class="output-placeholder">
        <i class="icon-terminal" style="font-size:24px;opacity:0.3"></i>
        <p>Run or submit your code to see results</p>
      </div>`;

    // Init Monaco editor
    await window.monacoReady;
    if (!this.editor) {
      this.editor = monaco.editor.create(document.getElementById('monacoEditor'), {
        value: this._defaultCode(),
        language: this._monacoLangMap[this._currentLang] || 'cpp',
        theme: 'vs-dark',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        automaticLayout: true,
        tabSize: 4,
        bracketPairColorization: { enabled: true },
      });
      // Code stats listener (set up once)
      this.editor.onDidChangeModelContent(() => {
        const val = this.editor.getValue();
        const el = document.getElementById('keyshintStats');
        if (el) el.textContent = `${val.split('\n').length} lines \u00b7 ${val.length} chars`;
      });
      // Keyboard shortcuts inside Monaco
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => this.runCode());
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => this.submitCode());
    }

    // Start recording for code replay
    this._startRecording();

    // Init gamified HUD
    this._initSolveHUD(p);
    this._startSolveTimer();
  },
  async _loadStatement(p) {
    const descEl = document.getElementById('solveDescriptionContent');
    descEl.innerHTML = `
      <div class="solve-statement-loader">
        <div class="loader-ring"></div>
        <p>Loading problem statement...</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:4px">First load may take a few seconds while fetching from ${this._esc(p.platform)}</p>
      </div>`;

    const stmt = await API.getStatement(p.id);
    this.currentStatement = stmt;

    const tags = JSON.parse(p.tags || '[]');
    const hasContent = stmt.ok && (stmt.statement || '').trim().length > 10;

    // Build meta header (shown always)
    let metaHtml = `<div class="problem-statement-wrap">`;
    metaHtml += `<h2>${this._esc(p.title)}</h2>`;
    metaHtml += '<div class="problem-meta-bar">';
    if (hasContent && stmt.timeLimit) metaHtml += `<div class="meta-chip"><i class="icon-clock" style="font-size:13px"></i> ${this._esc(stmt.timeLimit)}</div>`;
    if (hasContent && stmt.memLimit) metaHtml += `<div class="meta-chip"><i class="icon-memory" style="font-size:13px"></i> ${this._esc(stmt.memLimit)}</div>`;
    metaHtml += `<div class="meta-chip"><i class="icon-${p.platform === 'codeforces' ? 'bolt' : 'star'}" style="font-size:13px"></i> ${p.platform === 'codeforces' ? 'Codeforces' : 'CodeChef'}</div>`;
    metaHtml += `<div class="meta-chip">${this._ratingBadge(p.rating)}</div>`;
    metaHtml += `<button class="btn btn-ghost btn-sm translate-btn" onclick="App.translateStatement()" title="Translate to English" style="margin-left:auto;gap:4px;font-size:12px"><i class="icon-globe"></i> Translate</button>`;
    metaHtml += '</div>';
    if (tags.length) {
      metaHtml += '<div class="problem-tags-bar">' + tags.map(t => `<span class="p-tag">${this._esc(t)}</span>`).join('') + '</div>';
    }

    if (!hasContent) {
      // Clean local fallback — no iframe, no redirect
      metaHtml += stmt.statement || `
        <div style="text-align:center;padding:24px 16px">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Problem statement could not be loaded locally.</p>
          <a href="${this._esc(p.url)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Open on ${this._esc(p.platform)} \u2192</a>
        </div>`;
      metaHtml += '</div>';
      descEl.innerHTML = metaHtml;
      return;
    }

    // Statement body from scraper
    let html = metaHtml;
    html += '<div class="problem-body">';
    html += stmt.statement || '';
    if (stmt.inputSpec) html += stmt.inputSpec;
    if (stmt.outputSpec) html += stmt.outputSpec;
    if (stmt.note) html += '<h3>Note</h3>' + stmt.note;
    html += '</div>';

    // Sample testcases
    if (stmt.samples && stmt.samples.length) {
      html += '<div class="sample-tests-section">';
      html += '<h3 style="font-size:15px;font-weight:700;color:var(--text-bright);margin-bottom:10px">Examples</h3>';
      stmt.samples.forEach((s, i) => {
        html += `
          <div class="sample-test-card">
            <div class="sample-test-header">
              <span>Example ${i + 1}</span>
              <button class="btn btn-ghost btn-sm" onclick="App.importSample(${i})" title="Import as testcase"><i class="icon-plus" style="font-size:12px"></i> Import</button>
            </div>
            <div class="sample-test-body">
              <div class="sample-col">
                <div class="sample-col-label">Input</div>
                <pre>${this._esc(s.input)}</pre>
              </div>
              <div class="sample-col">
                <div class="sample-col-label">Output</div>
                <pre>${this._esc(s.output)}</pre>
              </div>
            </div>
          </div>`;
      });
      html += '<button class="btn btn-gold btn-sm mt-2" onclick="App.importAllSamples()"><i class="icon-plus" style="font-size:12px"></i> Import All Samples</button>';
      html += '</div>';
    }

    html += '</div>';
    descEl.innerHTML = html;

    // Store original HTML for translate toggle
    this._originalStatementHtml = descEl.innerHTML;
    this._isTranslated = false;

    // Auto-import samples if no testcases yet
    if (stmt.samples?.length && (!this.currentProblem.testcases || !this.currentProblem.testcases.length)) {
      this.importAllSamples();
    }
  },

  async importSample(idx) {
    if (!this.currentStatement?.samples?.[idx] || !this.currentProblem) return;
    const s = this.currentStatement.samples[idx];
    const p = this.currentProblem.problem;
    await API.addTestcase({
      problem_rowid: p.id,
      label: `Sample ${idx + 1}`,
      input: s.input,
      expected_output: s.output,
    });
    const data = await API.getProblem(p.id);
    this.currentProblem = data;
    this._renderBottomTestcases(data.testcases);
    this.switchBottomTab('testcases');
    this.toast('[cp] sample imported', 'success');
  },

  async importAllSamples() {
    if (!this.currentStatement?.samples?.length || !this.currentProblem) return;
    const p = this.currentProblem.problem;
    for (let i = 0; i < this.currentStatement.samples.length; i++) {
      const s = this.currentStatement.samples[i];
      await API.addTestcase({
        problem_rowid: p.id,
        label: `Sample ${i + 1}`,
        input: s.input,
        expected_output: s.output,
      });
    }
    const data = await API.getProblem(p.id);
    this.currentProblem = data;
    this._renderBottomTestcases(data.testcases);
    this.switchBottomTab('testcases');
    this.toast(`[cp] imported ${this.currentStatement.samples.length} samples`, 'success');
  },

  async translateStatement() {
    const btn = document.querySelector('.translate-btn');
    const body = document.querySelector('.problem-body');
    if (!body || !btn) return;

    if (this._isTranslated) {
      body.innerHTML = this._originalStatementHtml;
      btn.innerHTML = '\ud83c\udf10 Translate';
      this._isTranslated = false;
      return;
    }

    btn.innerHTML = '\u23f3 Translating...';
    btn.disabled = true;
    try {
      const res = await API.translate(body.innerHTML, 'en');
      if (res.ok) {
        this._translatedHtml = res.translated;
        body.innerHTML = res.translated;
        btn.innerHTML = '\ud83c\udf10 Show Original';
        this._isTranslated = true;
      } else {
        this.toast('Translation failed', 'error');
        btn.innerHTML = '\ud83c\udf10 Translate';
      }
    } catch (e) {
      this.toast('Translation failed: ' + e.message, 'error');
      btn.innerHTML = '\ud83c\udf10 Translate';
    }
    btn.disabled = false;
  },

  /* ===== AI Opponent Mode ===== */
  async startAiBattle() {
    if (!this.currentProblem) return;
    if (this._aiBattle) { this.cancelAiBattle(); return; }
    const p = this.currentProblem.problem;
    const res = await API.startAiBattle(p.id);
    if (!res.ok) { this.toast('[error] battle init failed', 'error'); return; }

    this._aiBattle = { battleId: res.battleId, aiTimeMs: res.aiTimeMs, startTime: Date.now() };
    this._aiBattleStart = Date.now();
    document.getElementById('aiRaceOverlay').classList.remove('hidden');
    document.getElementById('aiBattleBtn').innerHTML = '<i class="icon-flag-finish"></i> Racing...';
    document.getElementById('aiBattleBtn').style.color = 'var(--warning)';

    this._aiBattleTimer = setInterval(() => {
      if (!this._aiBattle) return;
      const elapsed = Date.now() - this._aiBattle.startTime;
      const aiPct = Math.min(100, (elapsed / this._aiBattle.aiTimeMs) * 100);
      document.getElementById('aiProgressFill').style.width = aiPct + '%';
      const aiRemaining = Math.max(0, this._aiBattle.aiTimeMs - elapsed);
      document.getElementById('aiTimeDisplay').textContent = this._formatTime(aiRemaining);
      document.getElementById('playerTimeDisplay').textContent = this._formatTime(elapsed);
      document.getElementById('playerProgressFill').style.width = Math.min(50, elapsed / this._aiBattle.aiTimeMs * 50) + '%';

      if (aiPct >= 100) {
        this._aiBattle.aiFinished = true;
        this.toast('<i class="icon-robot"></i> AI.solve() returned! hurry!', 'warning');
      }
    }, 100);

    this.toast('<i class="icon-robot"></i> [1v1] race initiated! beat the AI!', 'info');
  },

  async _completeAiBattle(won) {
    if (!this._aiBattle) return;
    const elapsed = Date.now() - this._aiBattle.startTime;
    await API.completeAiBattle(this._aiBattle.battleId, elapsed, won);
    clearInterval(this._aiBattleTimer);

    document.getElementById('playerProgressFill').style.width = '100%';
    const msg = won
      ? `<i class="icon-celebrate"></i> You won! (${this._formatTime(elapsed)} vs AI's ${this._formatTime(this._aiBattle.aiTimeMs)})`
      : `<i class="icon-robot"></i> AI was faster (${this._formatTime(this._aiBattle.aiTimeMs)} vs your ${this._formatTime(elapsed)})`;
    this.toast(msg, won ? 'success' : 'error');

    setTimeout(() => {
      document.getElementById('aiRaceOverlay').classList.add('hidden');
      document.getElementById('aiBattleBtn').innerHTML = '<i class="icon-robot"></i> Race';
      document.getElementById('aiBattleBtn').style.color = '';
      this._aiBattle = null;
    }, 2000);
  },

  cancelAiBattle() {
    if (this._aiBattleTimer) clearInterval(this._aiBattleTimer);
    document.getElementById('aiRaceOverlay').classList.add('hidden');
    document.getElementById('aiBattleBtn').innerHTML = '<i class="icon-robot"></i> Race';
    document.getElementById('aiBattleBtn').style.color = '';
    this._aiBattle = null;
  },

  _formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  },

  /* ===== Decomposition / Thinking Tab ===== */
  async _loadThinkingTab() {
    if (!this.currentProblem) return;
    const el = document.getElementById('solveThinkingContent');
    el.innerHTML = '<div class="solve-statement-loader"><div class="loader-ring"></div></div>';
    const p = this.currentProblem.problem;
    const data = await API.getDecomposition(p.id);
    const n = data.note || {};
    el.innerHTML = `<div class="thinking-panel">
      <h3><i class="icon-brain"></i> Problem Decomposition</h3>
      <p class="text-sm text-muted mb-3">Break down your thinking before coding. Auto-saves as you type.</p>
      <div class="thinking-section">
        <label><i class="icon-lightbulb"></i> Approach / Key Insight</label>
        <textarea class="input full-width think-field" id="thinkApproach" rows="3" placeholder="What's the main idea? What pattern do you see?"
          oninput="App._autoSaveDecomp()">${this._esc(n.approach || '')}</textarea>
      </div>
      <div class="thinking-section">
        <label><i class="icon-hammer"></i> Brute Force</label>
        <textarea class="input full-width think-field" id="thinkBrute" rows="2" placeholder="What's the naive solution?"
          oninput="App._autoSaveDecomp()">${this._esc(n.brute_force || '')}</textarea>
      </div>
      <div class="thinking-section">
        <label><i class="icon-bolt"></i> Optimization</label>
        <textarea class="input full-width think-field" id="thinkOptimize" rows="2" placeholder="How to optimize? What data structure or technique?"
          oninput="App._autoSaveDecomp()">${this._esc(n.optimization || '')}</textarea>
      </div>
      <div class="thinking-section">
        <label><i class="icon-building"></i> Data Structures</label>
        <textarea class="input full-width think-field" id="thinkDS" rows="2" placeholder="Arrays, maps, sets, trees, graphs?"
          oninput="App._autoSaveDecomp()">${this._esc(n.data_structures || '')}</textarea>
      </div>
      <div class="thinking-section">
        <label><i class="icon-warning"></i> Edge Cases</label>
        <textarea class="input full-width think-field" id="thinkEdge" rows="2" placeholder="Empty input, large numbers, negative values?"
          oninput="App._autoSaveDecomp()">${this._esc(n.edge_cases || '')}</textarea>
      </div>
    </div>`;
  },

  _autoSaveDecomp() {
    if (this._decompTimer) clearTimeout(this._decompTimer);
    this._decompTimer = setTimeout(() => {
      if (!this.currentProblem) return;
      API.saveDecomposition({
        problem_id: this.currentProblem.problem.id,
        approach: document.getElementById('thinkApproach')?.value || '',
        brute_force: document.getElementById('thinkBrute')?.value || '',
        optimization: document.getElementById('thinkOptimize')?.value || '',
        data_structures: document.getElementById('thinkDS')?.value || '',
        edge_cases: document.getElementById('thinkEdge')?.value || '',
      });
    }, 1000);
  },

  /* ===== Code Replay ===== */
  _startRecording() {
    this._replayEvents = [];
    this._replayStartTime = Date.now();
    if (this._replayListener) this._replayListener.dispose();
    if (this.editor) {
      this._replayListener = this.editor.onDidChangeModelContent(e => {
        if (this._collabSuppressChange) return;
        if (this._replayEvents.length > 2000) return; // cap
        this._replayEvents.push({
          t: Date.now() - this._replayStartTime,
          changes: e.changes.map(c => ({
            range: { startLineNumber: c.range.startLineNumber, startColumn: c.range.startColumn,
                     endLineNumber: c.range.endLineNumber, endColumn: c.range.endColumn },
            text: c.text
          }))
        });
      });
    }
  },

  async _saveReplay(submissionId) {
    if (this._replayEvents.length > 5) {
      await API.saveCodeReplay({
        submission_id: submissionId,
        events: this._replayEvents,
        duration_ms: Date.now() - (this._replayStartTime || Date.now()),
      });
    }
  },

  async showReplay(submissionId) {
    const data = await API.getCodeReplay(submissionId);
    if (!data.ok || !data.replay?.events?.length) { this.toast('[replay] no data available', 'info'); return; }
    const events = data.replay.events;
    const duration = data.replay.duration_ms;

    const descEl = document.getElementById('solveDescriptionContent');
    descEl.innerHTML = `<div class="replay-panel">
      <h3><i class="icon-run"></i> Code Replay</h3>
      <p class="text-sm text-muted">Duration: ${this._formatTime(duration)}</p>
      <div class="replay-controls">
        <button class="btn btn-primary btn-sm" id="replayPlayBtn" onclick="App._toggleReplay()"><i class="icon-play"></i> Play</button>
        <select class="input" id="replaySpeed" style="width:80px">
          <option value="1">1x</option><option value="2">2x</option><option value="4" selected>4x</option><option value="8">8x</option><option value="16">16x</option>
        </select>
        <div class="replay-progress-bar"><div class="replay-progress-fill" id="replayProgressFill" style="width:0%"></div></div>
        <span class="text-sm text-muted" id="replayTimeDisplay">0:00</span>
      </div>
      <button class="btn btn-ghost btn-sm mt-2" onclick="App.switchSolveTab('submissions')">← Back to submissions</button>
    </div>`;

    this._replayData = events;
    this._replayPlaying = false;
    this._replayIdx = 0;

    if (this.editor) this.editor.setValue(this._defaultCode());
  },

  _toggleReplay() {
    if (this._replayPlaying) {
      this._replayPlaying = false;
      document.getElementById('replayPlayBtn').innerHTML = '<i class="icon-play"></i> Play';
      return;
    }
    if (!this._replayData?.length) return;
    this._replayPlaying = true;
    this._replayIdx = 0;
    if (this.editor) this.editor.setValue(this._defaultCode());
    document.getElementById('replayPlayBtn').innerHTML = '<i class="icon-pause"></i> Pause';
    this._playNextReplayEvent();
  },

  _playNextReplayEvent() {
    if (!this._replayPlaying || !this._replayData || this._replayIdx >= this._replayData.length) {
      this._replayPlaying = false;
      const btn = document.getElementById('replayPlayBtn');
      if (btn) btn.innerHTML = '<i class="icon-play"></i> Play';
      return;
    }
    const speed = +(document.getElementById('replaySpeed')?.value || 4);
    const event = this._replayData[this._replayIdx];
    const nextEvent = this._replayData[this._replayIdx + 1];
    const delay = nextEvent ? Math.max(10, (nextEvent.t - event.t) / speed) : 0;

    if (this.editor && event.changes) {
      const edits = event.changes.map(c => ({
        range: new monaco.Range(c.range.startLineNumber, c.range.startColumn, c.range.endLineNumber, c.range.endColumn),
        text: c.text
      }));
      this.editor.executeEdits('replay', edits);
    }

    const pct = (this._replayIdx / this._replayData.length * 100);
    const fill = document.getElementById('replayProgressFill');
    const time = document.getElementById('replayTimeDisplay');
    if (fill) fill.style.width = pct + '%';
    if (time) time.textContent = this._formatTime(event.t);

    this._replayIdx++;
    setTimeout(() => this._playNextReplayEvent(), delay);
  },

  /* ===== Collaborative Mode ===== */
  toggleCollab() {
    if (this._collabRoom) { this.leaveCollab(); return; }
    const code = prompt('Enter room code to join, or leave empty to create a new room:');
    if (code === null) return;
    if (code.trim()) this.joinCollab(code.trim().toUpperCase());
    else this.createCollab();
  },

  createCollab() {
    if (!this.currentProblem || !this.editor) return;
    this._collabSocket = io();
    this._collabSocket.emit('create-room', {
      problemId: this.currentProblem.problem.id,
      code: this.editor.getValue(),
    });
    this._collabSocket.on('room-created', ({ roomId }) => {
      this._collabRoom = roomId;
      document.getElementById('collabIndicator').classList.remove('hidden');
      document.getElementById('collabInfo').textContent = `Room: ${roomId} (1 user)`;
      this.toast(`[room] spawned: ${roomId} — share code!`, 'success');
      this._setupCollabSync();
    });
    this._collabSocket.on('user-count', ({ count }) => {
      document.getElementById('collabInfo').textContent = `Room: ${this._collabRoom} (${count} users)`;
    });
  },

  joinCollab(roomId) {
    this._collabSocket = io();
    this._collabSocket.emit('join-room', { roomId });
    this._collabSocket.on('room-joined', (data) => {
      this._collabRoom = data.roomId;
      if (this.editor && data.code) {
        this._collabSuppressChange = true;
        this.editor.setValue(data.code);
        this._collabSuppressChange = false;
      }
      document.getElementById('collabIndicator').classList.remove('hidden');
      document.getElementById('collabInfo').textContent = `Room: ${data.roomId}`;
      this.toast(`[ssh] connected to room ${data.roomId}`, 'success');
      this._setupCollabSync();
    });
    this._collabSocket.on('room-error', ({ error }) => this.toast(error, 'error'));
    this._collabSocket.on('user-count', ({ count }) => {
      document.getElementById('collabInfo').textContent = `Room: ${this._collabRoom} (${count} users)`;
    });
  },

  _setupCollabSync() {
    if (!this._collabSocket || !this.editor) return;
    // Send local changes
    this.editor.onDidChangeModelContent(() => {
      if (this._collabSuppressChange || !this._collabRoom) return;
      this._collabSocket.emit('code-change', { roomId: this._collabRoom, code: this.editor.getValue() });
    });
    // Receive remote changes
    this._collabSocket.on('code-update', ({ code }) => {
      if (!this.editor) return;
      const pos = this.editor.getPosition();
      this._collabSuppressChange = true;
      this.editor.setValue(code);
      if (pos) this.editor.setPosition(pos);
      this._collabSuppressChange = false;
    });
  },

  leaveCollab() {
    if (this._collabSocket) { this._collabSocket.disconnect(); this._collabSocket = null; }
    this._collabRoom = null;
    document.getElementById('collabIndicator').classList.add('hidden');
    this.toast('[exit] left collaboration room', 'info');
  },

  /* ===== Visual Algorithm Debugger ===== */
  toggleDebug() {
    this._debugMode = !this._debugMode;
    const btn = document.getElementById('debugToggle');
    if (btn) {
      btn.style.color = this._debugMode ? 'var(--success)' : '';
      btn.style.background = this._debugMode ? 'var(--success-bg)' : '';
    }
    if (this._debugMode) {
      this.toast('Debug mode ON — add DBG_ARR/DBG_VAR macros to your code', 'success');
      this._injectDebugHeader();
    } else {
      this.toast('Debug mode OFF', 'info');
    }
  },

  _injectDebugHeader() {
    if (!this.editor) return;
    const code = this.editor.getValue();
    const debugHeader = `// === DEBUG MACROS (remove before submitting) ===
#define DBG_ARR(name, arr, n) { cerr << "##DBG_ARR##" << name << "##"; for(int _i=0;_i<(n);_i++) cerr << (arr)[_i] << ((_i<(n)-1)?" ":""); cerr << endl; }
#define DBG_VAR(name, val) { cerr << "##DBG_VAR##" << name << "##" << (val) << endl; }
// === END DEBUG ===`;
    if (!code.includes('DBG_ARR')) {
      const insertIdx = code.indexOf('using namespace std;');
      if (insertIdx >= 0) {
        const after = insertIdx + 'using namespace std;'.length;
        this.editor.setValue(code.slice(0, after) + '\n' + debugHeader + '\n' + code.slice(after));
      }
    }
  },

  _parseDebugOutput(stderr) {
    if (!stderr || !this._debugMode) return;
    const lines = stderr.split('\n');
    const debugData = [];
    for (const line of lines) {
      if (line.startsWith('##DBG_ARR##')) {
        const parts = line.split('##');
        const name = parts[2];
        const values = parts[3]?.split(' ').map(Number).filter(n => !isNaN(n)) || [];
        debugData.push({ type: 'array', name, values });
      } else if (line.startsWith('##DBG_VAR##')) {
        const parts = line.split('##');
        debugData.push({ type: 'var', name: parts[2], value: parts[3] });
      }
    }
    if (!debugData.length) return;

    const el = document.getElementById('bottomDebugContent');
    let html = '<div style="padding:12px">';
    for (const d of debugData) {
      if (d.type === 'array') {
        const max = Math.max(...d.values, 1);
        html += `<div class="debug-item"><span class="debug-label"><i class="icon-chart"></i> ${this._esc(d.name)}</span>
          <div class="debug-array">${d.values.map(v =>
            `<div class="debug-cell" style="background:rgba(29,78,216,${0.15 + v/max*0.6})"><span>${v}</span></div>`
          ).join('')}</div></div>`;
      } else {
        html += `<div class="debug-item"><span class="debug-label"><i class="icon-pin"></i> ${this._esc(d.name)}</span>
          <span class="debug-value">${this._esc(d.value)}</span></div>`;
      }
    }
    html += '</div>';
    el.innerHTML = html;
    this.switchBottomTab('debug');
  },

  /* ===================================================
     SOCIAL — INIT, PROFILE SETUP
     =================================================== */
  async _initSocial() {
    this._username = localStorage.getItem('cp_arena_username');
    if (this._username) {
      this._connectSocialSocket();
      this._checkUnreadMessages();
    }
  },

  _connectSocialSocket() {
    if (!this._username) return;
    this._socialSocket = io();
    this._socialSocket.emit('register-user', { username: this._username });

    this._socialSocket.on('new-message', ({ message }) => {
      if (this._currentChatUser === message.from_user) {
        this._appendChatMessage(message, 'sidebar');
      }
      this._checkUnreadMessages();
    });

    this._socialSocket.on('friend-request-received', ({ from }) => {
      this.toast(`${from} sent you a friend request!`, 'info');
      this._checkUnreadMessages();
    });

    this._socialSocket.on('user-online', ({ username }) => {
      this._onlineFriends.add(username);
      this._updateFriendStatuses();
    });

    this._socialSocket.on('user-offline', ({ username }) => {
      this._onlineFriends.delete(username);
      this._updateFriendStatuses();
    });

    // Solve room events
    this._socialSocket.on('room-members-updated', ({ roomId, members }) => {
      if (this._currentSolveRoom?.id === roomId) {
        this._renderRoomMembers(members);
      }
    });

    this._socialSocket.on('room-chat-message', (msg) => {
      if (this._currentSolveRoom?.id === msg.roomId) {
        this._appendRoomChatMessage(msg);
      }
    });

    this._socialSocket.on('room-code-update', ({ code }) => {
      if (this._solveRoomEditor) {
        const pos = this._solveRoomEditor.getPosition();
        this._solveRoomEditor.setValue(code);
        if (pos) this._solveRoomEditor.setPosition(pos);
      }
    });

    // WebRTC voice events
    this._socialSocket.on('voice-user-joined', async ({ username, socketId }) => {
      if (this._voiceEnabled) {
        await this._createPeerConnection(socketId, username, true);
      }
    });

    this._socialSocket.on('voice-user-left', ({ username }) => {
      this._removePeer(username);
    });

    this._socialSocket.on('voice-offer', async ({ from, offer, fromUsername }) => {
      if (!this._voiceEnabled) return;
      await this._createPeerConnection(from, fromUsername, false);
      const pc = this._peerConnections[from];
      if (pc) {
        await pc.connection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.connection.createAnswer();
        await pc.connection.setLocalDescription(answer);
        this._socialSocket.emit('voice-answer', { to: from, answer });
      }
    });

    this._socialSocket.on('voice-answer', async ({ from, answer }) => {
      const pc = this._peerConnections[from];
      if (pc) await pc.connection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    this._socialSocket.on('voice-ice-candidate', async ({ from, candidate }) => {
      const pc = this._peerConnections[from];
      if (pc && candidate) await pc.connection.addIceCandidate(new RTCIceCandidate(candidate));
    });
  },

  _updateFriendStatuses() {
    document.querySelectorAll('.friend-status-dot').forEach(el => {
      const u = el.dataset.username;
      if (u) {
        el.classList.toggle('online', this._onlineFriends.has(u));
        el.classList.toggle('offline', !this._onlineFriends.has(u));
      }
    });
  },

  async _checkUnreadMessages() {
    if (!this._username) return;
    try {
      const data = await API.getUnreadMessages(this._username);
      const badge = document.getElementById('socialUnreadBadge');
      if (badge && data.ok) {
        if (data.total > 0) {
          badge.textContent = data.total;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    } catch {}
  },

  showUserSetup() {
    const modal = document.getElementById('userSetupModal');
    const picker = document.getElementById('avatarPicker');
    const avatars = ['coder','fox','cat','wolf','sword','shield','trophy','diamond','fire','bolt','star','target','crown','robot','gamepad','brain','tree','globe','moon','dragon'];
    const avatarIconMap = {coder:'icon-avatar-coder',fox:'icon-avatar-fox',cat:'icon-avatar-cat',wolf:'icon-avatar-wolf',sword:'icon-sword',shield:'icon-shield',trophy:'icon-trophy',diamond:'icon-diamond',fire:'icon-fire',bolt:'icon-bolt',star:'icon-star',target:'icon-target',crown:'icon-crown',robot:'icon-robot',gamepad:'icon-gamepad',brain:'icon-brain',tree:'icon-tree',globe:'icon-globe',moon:'icon-moon',dragon:'icon-dragon'};
    picker.innerHTML = avatars.map((a, i) =>
      `<button class="avatar-option${i===0?' selected':''}" data-avatar="${a}" onclick="App._pickAvatar(this)"><i class="${avatarIconMap[a]}"></i></button>`
    ).join('');
    modal.classList.remove('hidden');
  },

  _pickAvatar(btn) {
    document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  },

  async completeSetup() {
    const username = document.getElementById('setupUsername').value.trim();
    const displayName = document.getElementById('setupDisplayName').value.trim();
    const avatar = document.querySelector('.avatar-option.selected')?.dataset.avatar || 'coder';
    const errEl = document.getElementById('setupError');

    if (!username || username.length < 2) {
      errEl.textContent = 'Username must be at least 2 characters';
      errEl.classList.remove('hidden');
      return;
    }

    const data = await API.registerUser({ username, display_name: displayName || username, avatar });
    if (!data.ok) {
      errEl.textContent = data.error || 'Registration failed';
      errEl.classList.remove('hidden');
      return;
    }

    localStorage.setItem('cp_arena_username', username);
    this._username = username;
    document.getElementById('userSetupModal').classList.add('hidden');
    this._connectSocialSocket();
    this.toast(`Welcome, ${displayName || username}!`, 'success');
    // Refresh social page if on it
    if (location.hash === '#/social') this.renderSocial(document.getElementById('pageContent'));
  },

  /* ===================================================
     SOCIAL PAGE
     =================================================== */
  async renderSocial(el) {
    if (!this._username) {
      el.innerHTML = `
        <div class="page-header">
          <h1><i class="icon-globe" style="font-size:28px"></i> <span class="glitch" data-text="Community">Community</span></h1>
          <p>ssh party@nexus.dev --join-squad</p>
          <span style="font-size:64px;display:block;margin-bottom:20px"><i class="icon-wave-hand"></i></span>
          <h2 style="margin-bottom:8px;color:var(--text-bright)">// identity not found</h2>
          <p style="color:var(--text-secondary);margin-bottom:24px">Create a handle to join the squad, pair-program & compete</p>
          <button class="btn btn-primary" onclick="App.showUserSetup()">useradd --create</button>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-globe" style="font-size:28px"></i> <span class="glitch" data-text="Community">Community</span></h1>
        <p>ssh party@nexus.dev --join-squad</p>
        <div class="social-tab-bar">
          <button class="social-tab active" data-stab="friends" onclick="App._switchSocialTab('friends',this)">
            <i class="icon-friends"></i> /allies
          </button>
          <button class="social-tab" data-stab="rooms" onclick="App._switchSocialTab('rooms',this)">
            <i class="icon-house"></i> /rooms
          </button>
          <button class="social-tab" data-stab="feed" onclick="App._switchSocialTab('feed',this)">
            <i class="icon-feed"></i> /feed
          </button>
        </div>
        <div id="socialTabContent">
          <div id="socialFriendsTab"></div>
          <div id="socialRoomsTab" class="hidden"></div>
          <div id="socialFeedTab" class="hidden"></div>
        </div>
      </div>`;

    this._loadFriendsTab();
  },

  _switchSocialTab(tab, btn) {
    document.querySelectorAll('.social-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('socialFriendsTab').classList.toggle('hidden', tab !== 'friends');
    document.getElementById('socialRoomsTab').classList.toggle('hidden', tab !== 'rooms');
    document.getElementById('socialFeedTab').classList.toggle('hidden', tab !== 'feed');
    if (tab === 'friends') this._loadFriendsTab();
    else if (tab === 'rooms') this._loadRoomsTab();
    else if (tab === 'feed') this._loadFeedTab();
  },

  async _loadFriendsTab() {
    const el = document.getElementById('socialFriendsTab');
    if (!el) return;
    const [friendsData, requestsData] = await Promise.all([
      API.getFriends(this._username),
      API.getFriendRequests(this._username),
    ]);

    let html = `
      <div class="social-section">
        <div class="social-section-header">
          <h3>Add Friend</h3>
        </div>
        <div class="friend-search-row">
          <input type="text" id="friendSearchInput" class="setup-input" placeholder="Search by username..."
            onkeydown="if(event.key==='Enter'){App._searchFriend()}" />
          <button class="btn btn-primary btn-sm" onclick="App._searchFriend()">Search</button>
        </div>
        <div id="friendSearchResults"></div>
      </div>`;

    // Pending requests
    if (requestsData.ok && requestsData.incoming.length) {
      html += `<div class="social-section">
        <div class="social-section-header"><h3>Pending Requests (${requestsData.incoming.length})</h3></div>
        <div class="friends-grid">`;
      for (const r of requestsData.incoming) {
        html += `<div class="friend-card request-card">
          <span class="friend-avatar">${this._renderAvatar(r.avatar)}</span>
          <div class="friend-info">
            <span class="friend-name">${this._esc(r.display_name || r.username)}</span>
            <span class="friend-username">@${this._esc(r.username)}</span>
          </div>
          <div class="friend-actions">
            <button class="btn btn-primary btn-sm" onclick="App._acceptFriend(${r.id})">Accept</button>
            <button class="btn btn-ghost btn-sm" onclick="App._rejectFriend(${r.id})">Decline</button>
          </div>
        </div>`;
      }
      html += `</div></div>`;
    }

    // Friends list
    html += `<div class="social-section">
      <div class="social-section-header"><h3>Friends (${friendsData.ok ? friendsData.friends.length : 0})</h3></div>`;
    if (friendsData.ok && friendsData.friends.length) {
      html += `<div class="friends-grid">`;
      for (const f of friendsData.friends) {
        const isOnline = this._onlineFriends.has(f.username) || f.status === 'online';
        if (isOnline) this._onlineFriends.add(f.username);
        html += `<div class="friend-card">
          <div class="friend-status-dot ${isOnline ? 'online' : 'offline'}" data-username="${this._esc(f.username)}"></div>
          <span class="friend-avatar">${this._renderAvatar(f.avatar)}</span>
          <div class="friend-info">
            <span class="friend-name">${this._esc(f.display_name || f.username)}</span>
            <span class="friend-username">@${this._esc(f.username)}</span>
            <span class="friend-meta">${isOnline ? '<i class="icon-circle-fill" style="color:#22c55e;font-size:8px"></i> Online' : '<i class="icon-circle-fill" style="color:#555;font-size:8px"></i> ' + (f.last_seen ? this._timeAgo(f.last_seen) : 'Offline')}</span>
          </div>
          <div class="friend-actions">
            <button class="btn btn-primary btn-sm" onclick="App.openChat('${this._esc(f.username)}')"><i class="icon-chat"></i> Chat</button>
            <button class="btn btn-ghost btn-sm" onclick="App._inviteToRoom('${this._esc(f.username)}')"><i class="icon-house"></i> Invite</button>
          </div>
        </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="empty-state">
        <span style="font-size:48px"><i class="icon-friends"></i></span>
        <p>// allies[] is empty — search handles above</p>
      </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;
  },

  async _searchFriend() {
    const input = document.getElementById('friendSearchInput');
    const q = input?.value?.trim();
    if (!q) return;
    const data = await API.searchUsers(q);
    const el = document.getElementById('friendSearchResults');
    if (!data.ok || !data.users.length) {
      el.innerHTML = '<p class="text-muted" style="padding:8px">No users found</p>';
      return;
    }
    el.innerHTML = data.users
      .filter(u => u.username !== this._username)
      .map(u => `<div class="friend-card compact">
        <span class="friend-avatar">${this._renderAvatar(u.avatar)}</span>
        <div class="friend-info">
          <span class="friend-name">${this._esc(u.display_name || u.username)}</span>
          <span class="friend-username">@${this._esc(u.username)}</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="App._sendFriendRequest('${this._esc(u.username)}')">Add Friend</button>
      </div>`).join('');
  },

  async _sendFriendRequest(to) {
    const data = await API.sendFriendRequest(this._username, to);
    if (data.ok) {
      this.toast(`Friend request sent to ${to}`, 'success');
      if (this._socialSocket) this._socialSocket.emit('notify-friend-request', { to, from: this._username });
    } else {
      this.toast(data.error || 'Failed to send request', 'error');
    }
  },

  async _acceptFriend(id) {
    await API.acceptFriendRequest(id);
    this.toast('Friend request accepted!', 'success');
    this._loadFriendsTab();
  },

  async _rejectFriend(id) {
    await API.rejectFriendRequest(id);
    this._loadFriendsTab();
  },

  _inviteToRoom(username) {
    this.toast(`Room invite sent to ${username}`, 'info');
  },

  /* ===================================================
     CHAT SIDEBAR (DMs)
     =================================================== */
  async openChat(username) {
    this._currentChatUser = username;
    const sidebar = document.getElementById('chatSidebar');
    const title = document.getElementById('chatSidebarTitle');
    const msgsEl = document.getElementById('chatSidebarMessages');
    title.textContent = `Chat with @${username}`;
    msgsEl.innerHTML = '<div class="chat-loading">Loading...</div>';
    sidebar.classList.remove('hidden');

    const data = await API.getMessages(this._username, username);
    msgsEl.innerHTML = '';
    if (data.ok && data.messages.length) {
      for (const msg of data.messages) {
        this._appendChatMessage(msg, 'sidebar');
      }
    } else {
      msgsEl.innerHTML = '<div class="chat-empty">No messages yet. Say hi! <i class="icon-wave-hand"></i></div>';
    }
    this._checkUnreadMessages();
    document.getElementById('chatSidebarInput').focus();
  },

  _appendChatMessage(msg, target) {
    const container = target === 'sidebar'
      ? document.getElementById('chatSidebarMessages')
      : document.getElementById('solveRoomChatMessages');
    if (!container) return;
    const isMine = msg.from_user === this._username;
    const empty = container.querySelector('.chat-empty');
    if (empty) empty.remove();
    container.insertAdjacentHTML('beforeend', `
      <div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
        <div class="chat-msg-bubble">${this._esc(msg.content)}</div>
        <div class="chat-msg-time">${this._formatTime(msg.created_at)}</div>
      </div>`);
    container.scrollTop = container.scrollHeight;
  },

  async sendChatMessage() {
    const input = document.getElementById('chatSidebarInput');
    if (!input || !input.value.trim() || !this._currentChatUser) return;
    const content = input.value.trim();
    input.value = '';
    if (this._socialSocket) {
      this._socialSocket.emit('direct-message', { from: this._username, to: this._currentChatUser, content });
    } else {
      await API.sendMessage(this._username, this._currentChatUser, content);
    }
    // Optimistic render
    this._appendChatMessage({ from_user: this._username, content, created_at: new Date().toISOString() }, 'sidebar');
  },

  closeChatSidebar() {
    document.getElementById('chatSidebar').classList.add('hidden');
    this._currentChatUser = null;
  },

  _formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  /* ===================================================
     SOLVE ROOMS
     =================================================== */
  async _loadRoomsTab() {
    const el = document.getElementById('socialRoomsTab');
    if (!el) return;
    const data = await API.getRooms();

    let html = `
      <div class="social-section">
        <div class="social-section-header">
          <h3>Create a Room</h3>
        </div>
        <div class="create-room-form">
          <input type="text" id="roomNameInput" class="setup-input" placeholder="Room name (e.g. DP Practice)" maxlength="50" />
          <div class="room-form-row">
            <input type="number" id="roomProblemId" class="setup-input" placeholder="Problem ID (optional)" style="flex:1" />
            <label class="room-voice-toggle">
              <input type="checkbox" id="roomVoiceCheck" /> <i class="icon-mic"></i> Voice
            </label>
          </div>
          <button class="btn btn-primary" onclick="App._createSolveRoom()">Create Room</button>
        </div>
      </div>
      <div class="social-section">
        <div class="social-section-header">
          <h3>Join a Room</h3>
          <div class="room-join-row">
            <input type="text" id="joinRoomCode" class="setup-input" placeholder="Room code" style="width:140px" maxlength="6" />
            <button class="btn btn-primary btn-sm" onclick="App._joinRoomByCode()">Join</button>
          </div>
        </div>`;

    if (data.ok && data.rooms.length) {
      html += `<div class="rooms-grid">`;
      for (const r of data.rooms) {
        html += `<div class="room-card">
          <div class="room-card-top">
            <span class="room-name">${this._esc(r.name)}</span>
            <span class="room-code">${r.id}</span>
          </div>
          <div class="room-card-info">
            <span class="room-creator">${this._renderAvatar(r.creator_avatar)} ${this._esc(r.creator)}</span>
            ${r.problem_title ? `<span class="room-problem">${this._ratingBadge(r.problem_rating)} ${this._esc(r.problem_title)}</span>` : ''}
            <span class="room-members-count"><i class="icon-friends"></i> ${r.member_count}/${r.max_members}</span>
            ${r.is_voice ? '<span class="room-voice-badge"><i class="icon-mic"></i> Voice</span>' : ''}
          </div>
          <button class="btn btn-primary btn-sm full-width" onclick="App.joinSolveRoom('${r.id}')">Join Room</button>
        </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="empty-state">
        <span style="font-size:48px"><i class="icon-house"></i></span>
        <p>// no rooms[] spawned yet — create one to begin</p>
      </div>`;
    }
    html += `</div>`;
    el.innerHTML = html;
  },

  async _createSolveRoom() {
    const name = document.getElementById('roomNameInput')?.value?.trim();
    if (!name) { this.toast('Room name is required', 'error'); return; }
    const problemId = document.getElementById('roomProblemId')?.value?.trim() || null;
    const isVoice = document.getElementById('roomVoiceCheck')?.checked || false;
    const data = await API.createRoom({
      name, creator: this._username,
      problem_id: problemId ? parseInt(problemId) : null,
      is_voice: isVoice
    });
    if (data.ok) {
      this.toast(`Room created! Code: ${data.room.id}`, 'success');
      this.joinSolveRoom(data.room.id);
    } else {
      this.toast(data.error || 'Failed to create room', 'error');
    }
  },

  async _joinRoomByCode() {
    const code = document.getElementById('joinRoomCode')?.value?.trim()?.toUpperCase();
    if (!code) return;
    this.joinSolveRoom(code);
  },

  async joinSolveRoom(roomId) {
    const data = await API.getRoom(roomId);
    if (!data.ok) { this.toast('Room not found', 'error'); return; }
    this._currentSolveRoom = data.room;

    // Show overlay
    const overlay = document.getElementById('solveRoomOverlay');
    overlay.classList.remove('hidden');
    document.getElementById('solveRoomName').textContent = `${data.room.name} (${roomId})`;
    document.getElementById('solveRoomProblem').textContent = data.room.problem_title
      ? `<i class="icon-document" style="font-size:14px"></i> ${data.room.problem_title} [${data.room.problem_rating}]` : '';

    // Init Monaco editor for room
    await window.monacoReady;
    if (!this._solveRoomEditor) {
      this._solveRoomEditor = monaco.editor.create(document.getElementById('solveRoomEditor'), {
        value: this._defaultCode(),
        language: this._monacoLangMap[this._currentLang] || 'cpp',
        theme: 'vs-dark',
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
        fontFamily: "'JetBrains Mono', monospace",
        padding: { top: 12 },
      });

      this._solveRoomEditor.onDidChangeModelContent(() => {
        if (this._socialSocket && this._currentSolveRoom) {
          this._socialSocket.emit('room-code-change', {
            roomId: this._currentSolveRoom.id,
            code: this._solveRoomEditor.getValue(),
            username: this._username
          });
        }
      });
    }

    // Join socket room
    if (this._socialSocket) {
      this._socialSocket.emit('join-solve-room', { roomId, username: this._username });
    }

    // Load chat history
    const chatData = await API.getRoomMessages(roomId);
    const chatEl = document.getElementById('solveRoomChatMessages');
    chatEl.innerHTML = '';
    if (chatData.ok && chatData.messages.length) {
      for (const msg of chatData.messages) {
        this._appendRoomChatMessage(msg);
      }
    }

    // Show voice button if voice-enabled
    if (data.room.is_voice) {
      document.getElementById('voiceToggleBtn').classList.remove('hidden');
    } else {
      document.getElementById('voiceToggleBtn').classList.add('hidden');
    }

    this.toast(`Joined room ${roomId}`, 'success');
  },

  _appendRoomChatMessage(msg) {
    const el = document.getElementById('solveRoomChatMessages');
    if (!el) return;
    const isMine = msg.username === this._username;
    el.insertAdjacentHTML('beforeend', `
      <div class="room-chat-msg ${isMine ? 'mine' : ''}">
        <span class="room-chat-avatar">${this._renderAvatar(msg.avatar)}</span>
        <div class="room-chat-content">
          <span class="room-chat-name">${this._esc(msg.display_name || msg.username)}</span>
          <span class="room-chat-text">${this._esc(msg.content)}</span>
        </div>
        <span class="room-chat-time">${this._formatTime(msg.created_at)}</span>
      </div>`);
    el.scrollTop = el.scrollHeight;
  },

  sendRoomChat() {
    const input = document.getElementById('solveRoomChatInput');
    if (!input || !input.value.trim() || !this._currentSolveRoom) return;
    const content = input.value.trim();
    input.value = '';
    if (this._socialSocket) {
      this._socialSocket.emit('room-chat', {
        roomId: this._currentSolveRoom.id,
        username: this._username,
        content
      });
    }
  },

  _renderRoomMembers(members) {
    const el = document.getElementById('roomMembersBar');
    if (!el) return;
    el.innerHTML = members.map(m =>
      `<span class="room-member-chip"><i class="icon-user"></i> ${this._esc(m)}</span>`
    ).join('');
  },

  leaveSolveRoom() {
    if (this._socialSocket && this._currentSolveRoom) {
      this._socialSocket.emit('leave-solve-room', {
        roomId: this._currentSolveRoom.id,
        username: this._username
      });
      if (this._voiceEnabled) this._stopVoice();
    }
    this._currentSolveRoom = null;
    document.getElementById('solveRoomOverlay').classList.add('hidden');
    if (this._solveRoomEditor) {
      this._solveRoomEditor.dispose();
      this._solveRoomEditor = null;
    }
    this.toast('Left room', 'info');
  },

  /* ===================================================
     VOICE CHAT (WebRTC)
     =================================================== */
  async toggleVoice() {
    if (this._voiceEnabled) {
      this._stopVoice();
    } else {
      await this._startVoice();
    }
  },

  async _startVoice() {
    if (!this._currentSolveRoom) return;
    try {
      this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this._voiceEnabled = true;
      this._voiceMuted = false;

      const btn = document.getElementById('voiceToggleBtn');
      btn.classList.add('active');
      btn.textContent = '';
      btn.innerHTML = '<i class="icon-mic"></i> End Voice';
      document.getElementById('voiceControls').classList.remove('hidden');
      document.getElementById('voiceStatus').textContent = 'Connected';

      // Notify room
      this._socialSocket.emit('voice-join', {
        roomId: this._currentSolveRoom.id,
        username: this._username
      });

      this.toast('Voice chat enabled', 'success');
    } catch (e) {
      this.toast('Microphone access denied', 'error');
    }
  },

  _stopVoice() {
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => t.stop());
      this._localStream = null;
    }
    // Close all peer connections
    for (const [id, pc] of Object.entries(this._peerConnections)) {
      pc.connection.close();
    }
    this._peerConnections = {};
    this._voiceEnabled = false;

    const btn = document.getElementById('voiceToggleBtn');
    if (btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="icon-mic"></i> Voice'; }
    document.getElementById('voiceControls')?.classList.add('hidden');

    // Remove audio elements
    document.querySelectorAll('.voice-audio').forEach(el => el.remove());

    if (this._socialSocket && this._currentSolveRoom) {
      this._socialSocket.emit('voice-leave', {
        roomId: this._currentSolveRoom.id,
        username: this._username
      });
    }
  },

  toggleMute() {
    if (!this._localStream) return;
    this._voiceMuted = !this._voiceMuted;
    this._localStream.getAudioTracks().forEach(t => { t.enabled = !this._voiceMuted; });
    const btn = document.getElementById('muteMicBtn');
    if (btn) btn.innerHTML = this._voiceMuted ? '<i class="icon-mic-off"></i>' : '<i class="icon-mic"></i>';
  },

  async _createPeerConnection(socketId, username, isInitiator) {
    const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pc = new RTCPeerConnection(config);
    this._peerConnections[socketId] = { connection: pc, username };

    // Add local stream
    if (this._localStream) {
      this._localStream.getTracks().forEach(t => pc.addTrack(t, this._localStream));
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      let audio = document.getElementById(`voice-${socketId}`);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = `voice-${socketId}`;
        audio.className = 'voice-audio';
        audio.autoplay = true;
        document.body.appendChild(audio);
      }
      audio.srcObject = event.streams[0];
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this._socialSocket.emit('voice-ice-candidate', { to: socketId, candidate: event.candidate });
      }
    };

    // Create offer if initiator
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this._socialSocket.emit('voice-offer', { to: socketId, offer, from: this._username });
    }
  },

  _removePeer(username) {
    for (const [id, pc] of Object.entries(this._peerConnections)) {
      if (pc.username === username) {
        pc.connection.close();
        delete this._peerConnections[id];
        const audio = document.getElementById(`voice-${id}`);
        if (audio) audio.remove();
      }
    }
  },

  /* ===================================================
     ACTIVITY FEED
     =================================================== */
  async _loadFeedTab() {
    const el = document.getElementById('socialFeedTab');
    if (!el) return;
    const data = await API.getFeed(this._username);
    if (!data.ok || !data.feed.length) {
      el.innerHTML = `<div class="empty-state">
        <span style="font-size:48px"><i class="icon-feed"></i></span>
        <p>No activity yet. Add friends and start solving!</p>
      </div>`;
      return;
    }

    el.innerHTML = `<div class="feed-list">${data.feed.map(item => `
      <div class="feed-item">
        <span class="feed-avatar">${this._renderAvatar(item.avatar)}</span>
        <div class="feed-content">
          <span class="feed-user">${this._esc(item.display_name || item.username)}</span>
          <span class="feed-text">${this._esc(item.content)}</span>
          ${item.problem_title ? `<span class="feed-problem">${this._ratingBadge(item.problem_rating)} ${this._esc(item.problem_title)}</span>` : ''}
        </div>
        <span class="feed-time">${this._timeAgo(item.created_at)}</span>
      </div>
    `).join('')}</div>`;
  },

  /* ===================================================
     AI CHAT HELPER (Floating Panel)
     =================================================== */
  _aiChatHistory: [],
  _aiChatInitialized: false,

  toggleAiChat() {
    const panel = document.getElementById('aiFloatPanel');
    const fab = document.getElementById('aiFab');
    if (!panel) return;
    const isOpen = !panel.classList.contains('hidden');
    if (isOpen) {
      panel.classList.add('hidden');
      if (fab) fab.classList.remove('active');
    } else {
      panel.classList.remove('hidden');
      if (fab) fab.classList.add('active');
      this._initAiChat();
      setTimeout(() => {
        const input = document.getElementById('aiChatInput');
        if (input) input.focus();
      }, 100);
    }
  },

  _initAiChat() {
    const el = document.getElementById('aiFloatPanel');
    if (!el) return;
    if (this._aiChatInitialized) return; // already built
    this._aiChatInitialized = true;
    this._aiChatHistory = [];

    el.innerHTML = `
      <div class="ai-chat-panel">
        <div class="ai-chat-header">
          <div class="ai-chat-avatar"><i class="icon-robot"></i></div>
          <div>
            <div class="ai-chat-title">AI Tutor</div>
            <div class="ai-chat-subtitle">Ask about approach, concepts, or hints — no code answers</div>
          </div>
          <button class="ai-chat-close" onclick="App.toggleAiChat()" title="Close">✕</button>
        </div>
        <div class="ai-chat-messages" id="aiChatMessages">
          <div class="ai-msg assistant">
            <div class="ai-msg-avatar"><i class="icon-robot"></i></div>
            <div class="ai-msg-bubble">
              <p>Hey! I'm your AI tutor for this problem. I can help you with:</p>
              <ul>
                <li>Understanding the problem statement</li>
                <li>Choosing the right algorithm or data structure</li>
                <li>Analyzing time/space complexity</li>
                <li>Debugging your approach (not code)</li>
                <li>Walking through examples step-by-step</li>
              </ul>
              <p><strong>I won't write code for you</strong> — but I'll guide you to the solution!</p>
            </div>
          </div>
        </div>
        <div class="ai-chat-input-area">
          <div class="ai-chat-suggestions" id="aiChatSuggestions">
            <button class="ai-suggestion" onclick="App._sendAiSuggestion(this)">What approach should I use?</button>
            <button class="ai-suggestion" onclick="App._sendAiSuggestion(this)">Explain the key insight</button>
            <button class="ai-suggestion" onclick="App._sendAiSuggestion(this)">What's the time complexity?</button>
            <button class="ai-suggestion" onclick="App._sendAiSuggestion(this)">Walk me through an example</button>
          </div>
          <div class="ai-chat-input-row">
            <input type="text" id="aiChatInput" class="ai-chat-input" placeholder="Ask about the problem..." autocomplete="off"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();App._sendAiChat()}" />
            <button class="btn btn-primary btn-sm ai-chat-send" onclick="App._sendAiChat()" id="aiChatSendBtn">
              <i class="icon-send"></i>
            </button>
          </div>
        </div>
      </div>`;
  },

  _sendAiSuggestion(btn) {
    const input = document.getElementById('aiChatInput');
    if (input) input.value = btn.textContent;
    this._sendAiChat();
  },

  async _sendAiChat() {
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiChatSendBtn');
    if (!input || !input.value.trim()) return;
    const question = input.value.trim();
    input.value = '';

    // Disable send
    if (sendBtn) sendBtn.disabled = true;

    // Hide suggestions after first message
    const sugEl = document.getElementById('aiChatSuggestions');
    if (sugEl) sugEl.classList.add('hidden');

    // Add user message to UI
    const msgsEl = document.getElementById('aiChatMessages');
    msgsEl.insertAdjacentHTML('beforeend', `
      <div class="ai-msg user">
        <div class="ai-msg-bubble">${this._esc(question)}</div>
        <div class="ai-msg-avatar"><i class="icon-user"></i></div>
      </div>`);

    // Add loading indicator
    msgsEl.insertAdjacentHTML('beforeend', `
      <div class="ai-msg assistant" id="aiTypingIndicator">
        <div class="ai-msg-avatar"><i class="icon-robot"></i></div>
        <div class="ai-msg-bubble ai-typing">
          <span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>
        </div>
      </div>`);
    msgsEl.scrollTop = msgsEl.scrollHeight;

    // Build problem statement text
    let statement = '';
    if (this.currentStatement) {
      statement = (this.currentStatement.statement || '') + '\n';
      if (this.currentStatement.inputSpec) statement += 'Input: ' + this.currentStatement.inputSpec + '\n';
      if (this.currentStatement.outputSpec) statement += 'Output: ' + this.currentStatement.outputSpec + '\n';
    }
    if (this.currentProblem?.problem) {
      const p = this.currentProblem.problem;
      statement = `Problem: ${p.title}\nRating: ${p.rating}\nTags: ${p.tags || 'none'}\n\n` + statement;
    }

    // Send to API
    const data = await API.aiChat(statement, question, this._aiChatHistory);

    // Remove typing indicator
    const typing = document.getElementById('aiTypingIndicator');
    if (typing) typing.remove();

    if (data.ok) {
      this._aiChatHistory.push({ role: 'user', content: question });
      this._aiChatHistory.push({ role: 'assistant', content: data.reply });

      // Render reply with markdown-ish formatting
      const formatted = this._formatAiReply(data.reply);
      msgsEl.insertAdjacentHTML('beforeend', `
        <div class="ai-msg assistant">
          <div class="ai-msg-avatar"><i class="icon-robot"></i></div>
          <div class="ai-msg-bubble">${formatted}</div>
        </div>`);
    } else {
      msgsEl.insertAdjacentHTML('beforeend', `
        <div class="ai-msg assistant">
          <div class="ai-msg-avatar"><i class="icon-robot"></i></div>
          <div class="ai-msg-bubble ai-error"><i class="icon-warning"></i> ${this._esc(data.error || 'Failed to get response')}</div>
        </div>`);
    }

    msgsEl.scrollTop = msgsEl.scrollHeight;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  },

  _formatAiReply(text) {
    // Simple markdown-ish formatting (no full markdown parser needed)
    let html = this._esc(text);
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Code blocks (```)
    html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="ai-code-block">$1</pre>');
    // Headers
    html = html.replace(/^### (.+)$/gm, '<strong style="font-size:14px;color:var(--text-bright)">$1</strong>');
    html = html.replace(/^## (.+)$/gm, '<strong style="font-size:15px;color:var(--text-bright)">$1</strong>');
    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$1. $2</li>');
    // Paragraphs (double newlines)
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = '<p>' + html + '</p>';
    // Clean up
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<li>)/g, '<ul>$1');
    html = html.replace(/(<\/li>)<\/p>/g, '$1</ul>');
    return html;
  },

  /* ===== Solve Tab Switching (show/hide) ===== */
  switchSolveTab(tab, btn) {
    this._solveTab = tab;
    document.querySelectorAll('.solve-tab').forEach(t => t.classList.toggle('active', t.dataset.stab === tab));

    const descDiv = document.getElementById('solveDescriptionContent');
    const subsDiv = document.getElementById('solveSubmissionsContent');

    descDiv.classList.add('hidden');
    subsDiv.classList.add('hidden');

    if (tab === 'description') {
      descDiv.classList.remove('hidden');
    } else {
      subsDiv.classList.remove('hidden');
      this._renderSolveSubmissions();
    }
  },

  async _renderSolveSubmissions() {
    if (!this.currentProblem) return;
    const subsDiv = document.getElementById('solveSubmissionsContent');
    const subs = this.currentProblem.submissions || [];
    if (!subs.length) {
      subsDiv.innerHTML = '<div class="solve-submissions"><div class="empty-state"><div class="empty-icon"><i class="icon-send" style="font-size:32px;opacity:0.3"></i></div><h3>No submissions yet</h3><p>Submit your code to see results here</p></div></div>';
      return;
    }
    subsDiv.innerHTML = `<div class="solve-submissions">${subs.map(s => `
      <div class="solve-sub-item">
        <span style="padding:3px 10px;border-radius:var(--radius-sm);font-size:12px;font-weight:700;background:var(--${s.verdict === 'AC' ? 'success' : s.verdict === 'WA' ? 'danger' : 'warning'}-bg);color:var(--${s.verdict === 'AC' ? 'success' : s.verdict === 'WA' ? 'danger' : 'warning'})">${s.verdict}</span>
        <div class="submission-info">
          <div class="submission-meta">
            <span>${s.exec_time_ms}ms</span> \u00b7 <span>${this._timeAgo(s.submitted_at)}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="App.showReplay(${s.id})" title="Watch Replay"><i class="icon-run"></i> Replay</button>
      </div>`).join('')}</div>`;
  },

  /* ===== Bottom Tab Switching (show/hide) ===== */
  switchBottomTab(tab, btn) {
    this._bottomTab = tab;
    document.querySelectorAll('.bottom-tab').forEach(t => t.classList.toggle('active', t.dataset.btab === tab));

    const tcDiv = document.getElementById('bottomTestcasesContent');
    const resDiv = document.getElementById('bottomResultsContent');
    const dbgDiv = document.getElementById('bottomDebugContent');

    tcDiv.classList.add('hidden');
    resDiv.classList.add('hidden');
    if (dbgDiv) dbgDiv.classList.add('hidden');

    if (tab === 'testcases') tcDiv.classList.remove('hidden');
    else if (tab === 'debug' && dbgDiv) dbgDiv.classList.remove('hidden');
    else resDiv.classList.remove('hidden');
  },

  /* ── TC Deck state ── */
  _tcDeckIdx: 0,
  _tcDeckData: [],   // { label, input, expected_output, id, passed?, actual? }

  _renderBottomTestcases(testcases) {
    this._tcDeckData = testcases || [];
    this._tcDeckIdx = 0;
    this._renderTcDeck();
  },

  _renderTcDeck() {
    const body = document.getElementById('tcDeckBody');
    const labelEl = document.getElementById('tcDeckLabel');
    const prevBtn = document.getElementById('tcPrevBtn');
    const nextBtn = document.getElementById('tcNextBtn');
    const tcs = this._tcDeckData;
    const idx = this._tcDeckIdx;

    if (!body) return;

    if (!tcs || !tcs.length) {
      if (labelEl) labelEl.textContent = 'TC 0 / 0';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      body.innerHTML = `
        <div class="tc-deck-empty">
          <div style="font-size:28px;opacity:0.25">[ ]</div>
          <span>// no test cases — import samples or +tc</span>
          <button class="btn btn-ghost btn-sm" onclick="App.toggleAddTestcase()" style="margin-top:8px">+ add testcase</button>
        </div>
        <div id="addTcForm" class="hidden"></div>`;
      return;
    }

    if (labelEl) labelEl.textContent = `TC ${idx + 1} / ${tcs.length}`;
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === tcs.length - 1;

    const tc = tcs[idx];
    const passed  = tc._passed;   // set by _renderRunResults after judging
    const failed  = tc._failed;
    const actual  = tc._actual;
    const verdict = tc._verdict;
    const timeMs  = tc._timeMs;

    const statusCls = passed ? 'passed' : failed ? 'failed' : '';
    const hasResult = passed !== undefined || failed !== undefined;

    let cardHtml = `
      <div class="tc-card ${statusCls}" style="animation: tcDeckFlip 0.22s ease both">
        <div class="tc-header">
          <span class="tc-label">
            <i class="icon-test" style="font-size:12px"></i> ${this._esc(tc.label || 'Test ' + (idx + 1))}
            ${hasResult ? `<span class="tc-verdict-badge" style="background:${passed ? 'var(--success-bg)':'var(--danger-bg)'};color:${passed ? 'var(--success)':'var(--danger)'};margin-left:6px">${verdict || (passed ? 'AC' : 'WA')}</span>` : ''}
            ${timeMs != null ? `<span style="font-size:10px;color:var(--text-muted)">${timeMs}ms</span>` : ''}
          </span>
          <div style="display:flex;gap:4px;align-items:center">
            <button class="btn btn-ghost btn-sm" onclick="App.deleteTestcase(${tc.id})" style="color:var(--danger);padding:2px 6px"><i class="icon-trash" style="font-size:12px"></i></button>
          </div>
        </div>
        <div class="tc-boxes${hasResult ? '-3' : ''}">
          <div class="tc-box"><label>Input</label><pre>${this._esc(tc.input || '')}</pre></div>
          <div class="tc-box"><label>Expected</label><pre class="${passed ? 'correct' : ''}">${this._esc(tc.expected_output || tc.expected || '')}</pre></div>
          ${hasResult ? `<div class="tc-box"><label>Output</label><pre class="${passed ? 'correct' : 'wrong'}">${this._esc(actual || '')}</pre></div>` : ''}
        </div>
        ${tc._stderr ? `<div style="padding:6px 10px;border-top:1px solid var(--border)"><label style="font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:600">Stderr</label><pre style="color:var(--warning);font-size:12px;margin:4px 0 0">${this._esc(tc._stderr)}</pre></div>` : ''}
      </div>
      <div id="addTcForm" class="hidden"></div>`;

    body.innerHTML = cardHtml;
  },

  tcDeckPrev() {
    if (this._tcDeckIdx > 0) { this._tcDeckIdx--; this._renderTcDeck(); }
  },
  tcDeckNext() {
    if (this._tcDeckIdx < this._tcDeckData.length - 1) { this._tcDeckIdx++; this._renderTcDeck(); }
  },

  toggleAddTestcase() {
    let form = document.getElementById('addTcForm');
    if (!form) return;
    if (form.classList.contains('hidden')) {
      form.classList.remove('hidden');
      form.innerHTML = `
        <div class="tc-add-form mt-2">
          <div class="tc-add-grid">
            <div><label class="text-sm text-muted">Input</label><textarea id="newTcInput" class="input full-width" placeholder="Input..."></textarea></div>
            <div><label class="text-sm text-muted">Expected Output</label><textarea id="newTcOutput" class="input full-width" placeholder="Expected output..."></textarea></div>
          </div>
          <div class="tc-add-actions">
            <button class="btn btn-primary btn-sm" onclick="App.addTestcase()"><i class="icon-plus" style="font-size:12px"></i> Add</button>
            <button class="btn btn-ghost btn-sm" onclick="App.toggleAddTestcase()">Cancel</button>
          </div>
        </div>`;
    } else {
      form.classList.add('hidden');
      form.innerHTML = '';
    }
  },

  async addTestcase() {
    const input = document.getElementById('newTcInput').value;
    const output = document.getElementById('newTcOutput').value;
    if (!input && !output) return;
    const p = this.currentProblem.problem;
    await API.addTestcase({ problem_rowid: p.id, label: `Test ${this.currentProblem.testcases.length + 1}`, input, expected_output: output });
    const data = await API.getProblem(p.id);
    this.currentProblem = data;
    this._renderBottomTestcases(data.testcases);
    this.toast('Test case added', 'success');
  },

  async deleteTestcase(id) {
    await API.deleteTestcase(id);
    const data = await API.getProblem(this.currentProblem.problem.id);
    this.currentProblem = data;
    this._renderBottomTestcases(data.testcases);
  },

  closeSolve() {
    const ov = document.getElementById('solveOverlay');
    ov.classList.add('hidden');
    // Reset zen mode on close
    ov.classList.remove('solve-zen');
    const zenBar = document.getElementById('zenRestoreBar');
    if (zenBar) zenBar.classList.add('hidden');
    const focusBtn = document.getElementById('focusModeBtn');
    if (focusBtn) focusBtn.classList.remove('zen-active');
    // Reset collapsed panels
    const solveHud = document.getElementById('solveHud');
    if (solveHud) solveHud.classList.remove('hud-collapsed');
    const solveLeft = document.getElementById('solveLeft');
    if (solveLeft) {
      solveLeft.classList.remove('left-collapsed', 'float-hidden', 'float-minimized');
      solveLeft.style.left = '16px'; solveLeft.style.top = '16px';
      solveLeft.style.width = '440px'; solveLeft.style.height = '';
      solveLeft.style.right = ''; solveLeft.style.bottom = '';
    }
    const bottomPanel = document.getElementById('bottomPanel');
    if (bottomPanel) {
      bottomPanel.classList.remove('bottom-collapsed', 'float-hidden', 'float-minimized');
      bottomPanel.style.right = '16px'; bottomPanel.style.bottom = '16px';
      bottomPanel.style.left = 'auto'; bottomPanel.style.top = 'auto';
      bottomPanel.style.width = '520px'; bottomPanel.style.height = '280px';
    }
    const strip = document.getElementById('leftCollapseStrip');
    if (strip) strip.classList.add('hidden');
    // Reset toolbar indicators
    const probBtn = document.getElementById('probPanelBtn');
    if (probBtn) probBtn.classList.remove('fp-hidden-indicator');
    const tcBtn = document.getElementById('tcPanelBtn');
    if (tcBtn) tcBtn.classList.remove('fp-hidden-indicator');
    this._focusMode = false;

    this.currentProblem = null;
    this.currentStatement = null;

    // Stop solve timer
    this._stopSolveTimer();
    if (this._aiBattle) this.cancelAiBattle();

    // Clean up collaboration
    if (this._collabSocket) this.leaveCollab();

    // Clean up replay recording
    if (this._replayListener) {
      this._replayListener.dispose();
      this._replayListener = null;
    }
    this._replayEvents = [];

    // Reset debug mode
    this._debugMode = false;
    const dbgBtn = document.getElementById('debugToggle');
    if (dbgBtn) dbgBtn.classList.remove('active');

    // Reset AI chat
    this._aiChatHistory = [];
    this._aiChatInitialized = false;
    const aiPanel = document.getElementById('aiFloatPanel');
    if (aiPanel) { aiPanel.classList.add('hidden'); aiPanel.innerHTML = ''; }
  },

  /* ===================================================
     GAMIFIED HUD LOGIC
     =================================================== */
  _initSolveHUD(p) {
    this._solveAttempts = 0;
    this._solveCombo = 0;
    const attEl = document.getElementById('hudAttemptsValue');
    if (attEl) attEl.textContent = '0';
    const r = p.rating || 800;
    let xp = 10;
    if (r >= 2200) xp = 150; else if (r >= 2000) xp = 100; else if (r >= 1800) xp = 80;
    else if (r >= 1600) xp = 60; else if (r >= 1400) xp = 40; else if (r >= 1200) xp = 25; else if (r >= 1000) xp = 15;
    this._baseXpReward = xp;
    const xpEl = document.getElementById('hudXpValue');
    if (xpEl) xpEl.textContent = `+${xp}`;
    const comboFire = document.getElementById('comboFire');
    const comboCount = document.getElementById('comboCount');
    const comboMulti = document.getElementById('comboMulti');
    if (comboFire) comboFire.textContent = '';
    if (comboCount) comboCount.textContent = '';
    if (comboMulti) comboMulti.textContent = '';
    const flameEl = document.getElementById('solveDifficultyFlame');
    if (flameEl) {
      let tier, label, icon;
      if (r >= 2400)      { tier = 'boss';   icon = '\u{1F480}'; label = 'BOSS'; }
      else if (r >= 2000) { tier = 'master'; icon = '\u2620\uFE0F'; label = 'MASTER'; }
      else if (r >= 1800) { tier = 'expert'; icon = '\uD83D\uDD25'; label = 'EXPERT'; }
      else if (r >= 1600) { tier = 'elite';  icon = '\u26A1'; label = 'ELITE'; }
      else if (r >= 1400) { tier = 'warrior';icon = '\u2694\uFE0F'; label = 'WARRIOR'; }
      else if (r >= 1200) { tier = 'warrior';icon = '\uD83D\uDDE1\uFE0F'; label = 'APPRENTICE'; }
      else if (r >= 1000) { tier = 'novice'; icon = '\uD83C\uDF31'; label = 'NOVICE'; }
      else                { tier = 'novice'; icon = '\uD83D\uDD30'; label = 'ROOKIE'; }
      flameEl.setAttribute('data-tier', tier);
      flameEl.innerHTML = `${icon} ${label}`;
    }
    const questEl = document.getElementById('solveHudQuest');
    if (questEl) questEl.textContent = r >= 2000
      ? `\u27E8 BOSS BATTLE \u27E9  ${p.problem_id} \u2014 ${p.title}`
      : `\u27E8 MISSION \u27E9  ${p.problem_id} \u2014 ${p.title}`;
    const statsEl = document.getElementById('keyshintStats');
    if (statsEl) statsEl.textContent = '0 lines \u00b7 0 chars';
    const editorEl = document.getElementById('monacoEditor');
    if (editorEl) editorEl.className = 'editor-container';
    // Reset deck state
    this._tcDeckIdx = 0;
  },

  _updateHpBar() { /* removed — HP replaced by tries counter */ },

  _startSolveTimer() {
    this._stopSolveTimer();
    this._solveSecondsElapsed = 0;
    const display = document.getElementById('solveTimerDisplay');
    const timerEl = document.getElementById('solveHudTimer');
    if (timerEl) timerEl.removeAttribute('data-urgency');
    this._solveTimerInterval = setInterval(() => {
      this._solveSecondsElapsed++;
      const m = Math.floor(this._solveSecondsElapsed / 60);
      const s = this._solveSecondsElapsed % 60;
      if (display) display.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      // Mirror time in zen bar
      const zenTimer = document.getElementById('zenTimerDisplay');
      if (zenTimer) zenTimer.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (timerEl) {
        const secs = this._solveSecondsElapsed;
        if (secs >= 3600)      timerEl.dataset.urgency = 'danger';
        else if (secs >= 1800) timerEl.dataset.urgency = 'slow';
        else if (secs >= 600)  timerEl.dataset.urgency = 'normal';
        else                   delete timerEl.dataset.urgency;
      }
    }, 1000);
  },

  _stopSolveTimer() {
    if (this._solveTimerInterval) { clearInterval(this._solveTimerInterval); this._solveTimerInterval = null; }
  },

  _screenShake() {
    const el = document.getElementById('solveOverlay');
    if (!el) return;
    el.classList.remove('screenshake');
    void el.offsetWidth;
    el.classList.add('screenshake');
    setTimeout(() => el.classList.remove('screenshake'), 650);
  },

  _showComboPopup(n) {
    if (n < 2) return;
    const el = document.getElementById('solveComboPopup');
    if (!el) return;
    const labels = { 2: 'DOUBLE!', 3: 'TRIPLE!', 4: 'QUAD!', 5: 'PENTA KILL!' };
    el.textContent = labels[n] || `COMBO \xd7${n}!`;
    el.classList.remove('hidden', 'combo-pop-animate');
    void el.offsetWidth;
    el.classList.add('combo-pop-animate');
    if (this._comboPopupTimer) clearTimeout(this._comboPopupTimer);
    this._comboPopupTimer = setTimeout(() => { el.classList.add('hidden'); el.classList.remove('combo-pop-animate'); }, 1600);
  },

  _updateComboHud() {
    const n = this._solveCombo;
    const comboFire = document.getElementById('comboFire');
    const comboCount = document.getElementById('comboCount');
    const comboMulti = document.getElementById('comboMulti');
    if (comboFire) comboFire.textContent = n >= 2 ? '\uD83D\uDD25' : n === 1 ? '\u2713' : '';
    if (comboCount) comboCount.textContent = n >= 1 ? `${n}\xd7` : '';
    if (comboMulti) comboMulti.textContent = n >= 3 ? `(+${Math.min(n - 1, 5) * 20}% xp)` : '';
  },

  /* ===================================================
     RUN / SUBMIT
     =================================================== */
  async runCode() {
    if (!this.editor) return;
    const code = this.editor.getValue();
    const lang = this._currentLang;
    const resDiv = document.getElementById('bottomResultsContent');
    const editorEl = document.getElementById('monacoEditor');
    const runBtn = document.getElementById('runCodeBtn');
    resDiv.innerHTML = '<div class="flex items-center gap-2" style="padding:16px"><span class="spinner-sm"></span> <span style="font-family:var(--mono);font-size:12px">$ ./run...</span></div>';
    this.switchBottomTab('results');
    if (editorEl) editorEl.classList.add('editor-running');
    if (runBtn) runBtn.classList.add('running');

    try {
      if (this.currentProblem?.testcases?.length) {
        const result = await API.judge({ code, testcases: this.currentProblem.testcases, language: lang });
        this._renderRunResults(result, false);
        if (this._debugMode && result.results) {
          const allStderr = result.results.map(r => r.stderr || '').join('\n');
          if (allStderr) this._parseDebugOutput(allStderr);
        }
      } else {
        const result = await API.run(code, '', lang);
        resDiv.innerHTML = `<div style="padding:12px"><pre style="color:var(--text-primary);margin:0">${this._esc(result.output || '(no output)')}</pre>${result.stderr ? `<pre style="color:var(--danger);margin:8px 0 0">${this._esc(result.stderr)}</pre>` : ''}</div>`;
        if (this._debugMode && result.stderr) this._parseDebugOutput(result.stderr);
      }
    } finally {
      if (editorEl) { editorEl.classList.remove('editor-running'); }
      if (runBtn) runBtn.classList.remove('running');
    }
  },

  async submitCode() {
    if (!this.editor || !this.currentProblem) return;
    const code = this.editor.getValue();
    const lang = this._currentLang;
    const p = this.currentProblem.problem;
    const resDiv = document.getElementById('bottomResultsContent');
    const editorEl = document.getElementById('monacoEditor');
    const submitBtn = document.getElementById('submitCodeBtn');
    resDiv.innerHTML = '<div class="flex items-center gap-2" style="padding:16px"><span class="spinner-sm"></span><span style="font-family:var(--mono);font-size:12px">$ git push origin main -- judging...</span></div>';
    this.switchBottomTab('results');
    if (editorEl) editorEl.classList.add('editor-running');
    if (submitBtn) submitBtn.disabled = true;

    // Track attempt
    this._solveAttempts++;
    const attEl = document.getElementById('hudAttemptsValue');
    if (attEl) attEl.textContent = this._solveAttempts;

    const prevAchievements = this._previousAchievements || [];

    try {
      const result = await API.judge({
        problem_id: p.id, code, language: lang,
        testcases: this.currentProblem.testcases || [],
      });
      this._renderRunResults(result, true);

      if (result.verdict === 'AC') {
        // Combo up
        this._solveCombo++;
        this._updateComboHud();
        this._showComboPopup(this._solveCombo);
        // Editor green glow
        if (editorEl) { editorEl.classList.remove('editor-running', 'editor-wa'); editorEl.classList.add('editor-ac'); }
        // XP popup and celebrations
        this._showXpPopup(p);
        this._checkNewAchievements(prevAchievements);
        this._updateSidebarPlayer();
        this._fireConfetti();
        if (this._aiBattle) this._completeAiBattle(true);
      } else if (result.verdict && result.verdict !== 'AC') {
        // Wrong answer — HP down, screen shake
        this._solveCombo = 0;
        this._updateComboHud();
        this._screenShake();
        if (editorEl) { editorEl.classList.remove('editor-running', 'editor-ac'); editorEl.classList.add('editor-wa'); }
        setTimeout(() => { if (editorEl) editorEl.classList.remove('editor-wa'); }, 2000);
      }

      const data = await API.getProblem(p.id);
      this.currentProblem = data;
      if (data?.submissions?.length) {
        const latestSub = data.submissions[data.submissions.length - 1];
        this._saveReplay(latestSub.id);
      }
    } finally {
      if (editorEl) editorEl.classList.remove('editor-running');
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  _renderRunResults(result, isSubmit) {
    if (result.compileError) {
      // Show compile error in results tab
      this.switchBottomTab('results');
      const resDiv = document.getElementById('bottomResultsContent');
      resDiv.innerHTML = `<div style="padding:10px"><div class="verdict-banner ce"><i class="icon-cross" style="font-size:18px"></i> Compilation Error</div><pre style="color:var(--danger);font-size:12px;white-space:pre-wrap;padding:0 8px">${this._esc(result.compileError)}</pre></div>`;
      return;
    }

    const v = result.verdict;
    const iconName = v === 'AC' ? 'check' : v === 'WA' ? 'cross' : v === 'TLE' ? 'clock' : 'cross';
    const timeStr = this._solveSecondsElapsed > 0
      ? ` &nbsp;<span class="boss-label">\u23F1 ${String(Math.floor(this._solveSecondsElapsed/60)).padStart(2,'0')}:${String(this._solveSecondsElapsed%60).padStart(2,'0')}</span>`
      : '';
    const acLabel = `<i class="icon-circle-check"></i> ACCEPTED \u2014 MISSION COMPLETE${timeStr}`;
    const label = v === 'AC' ? acLabel
      : v === 'WA' ? '<i class="icon-circle-x"></i> Wrong Answer \u2014 try again'
      : v === 'TLE' ? '<i class="icon-clock"></i> Time Limit Exceeded'
      : v === 'RE' ? '<i class="icon-explosion"></i> Runtime Error' : v;

    // Merge run results back into the deck data so deck shows pass/fail
    if (result.results && result.results.length) {
      result.results.forEach((r, i) => {
        if (this._tcDeckData[i]) {
          this._tcDeckData[i]._passed  = r.verdict === 'AC';
          this._tcDeckData[i]._failed  = r.verdict !== 'AC';
          this._tcDeckData[i]._verdict = r.verdict;
          this._tcDeckData[i]._actual  = r.actual;
          this._tcDeckData[i]._timeMs  = r.timeMs;
          this._tcDeckData[i]._stderr  = r.stderr;
        }
      });
      // Jump to first failed test case
      const firstFail = result.results.findIndex(r => r.verdict !== 'AC');
      if (firstFail >= 0) this._tcDeckIdx = firstFail;
      this._renderTcDeck();
      this.switchBottomTab('testcases');
    }

    // Also show verdict banner in results tab
    if (isSubmit) {
      const resDiv = document.getElementById('bottomResultsContent');
      resDiv.innerHTML = `<div style="padding:10px"><div class="verdict-banner ${v.toLowerCase()}"><i class="icon-${iconName}" style="font-size:18px"></i> ${label}</div></div>`;
      // For AC switch to testcases to celebrate, for WA stay on testcases (deck jumped to fail)
      if (v === 'AC') this.switchBottomTab('results');
    }
  },

  resetCode() {
    if (this.editor) this.editor.setValue(this._defaultCode());
  },

  /* ===================================================
     XP & ACHIEVEMENT POPUPS
     =================================================== */
  _showXpPopup(problem) {
    const r = problem.rating || 800;
    let xp = this._baseXpReward || 10;
    // Combo bonus
    const combo = this._solveCombo;
    const comboBonus = combo >= 2 ? Math.min(combo - 1, 5) * 0.2 : 0;
    // Speed bonus: solve in < 5 min = +50%, < 15 min = +25%
    const secs = this._solveSecondsElapsed;
    const speedBonus = secs < 300 ? 0.5 : secs < 900 ? 0.25 : 0;
    const total = Math.round(xp * (1 + comboBonus + speedBonus));

    const popup = document.getElementById('xpPopup');
    const text = document.getElementById('xpPopupText');
    const sub = document.getElementById('xpPopupSub');
    if (text) text.textContent = `+${total} XP`;
    let subParts = [];
    if (comboBonus > 0) subParts.push(`\uD83D\uDD25 COMBO x${combo}`);
    if (speedBonus > 0) subParts.push(secs < 300 ? '\u26A1 SPEED BONUS' : '\uD83D\uDCA8 QUICK SOLVE');
    if (sub) sub.textContent = subParts.join('  ');
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 2200);
  },

  async _checkNewAchievements(prevAchievements) {
    try {
      const data = await API.getStats();
      if (!data.ok) return;
      this._previousAchievements = data.achievements;

      // Find newly unlocked achievements
      for (const achv of data.achievements) {
        if (!achv.unlocked_at) continue;
        const prev = prevAchievements.find(a => a.id === achv.id);
        if (prev && !prev.unlocked_at) {
          // New unlock!
          this._showAchievementPopup(achv);
          break; // Show one at a time
        }
      }
    } catch {}
  },

  _showAchievementPopup(achievement) {
    const popup = document.getElementById('achievementPopup');
    const icon = this._achieveIconMap[achievement.icon] || '<i class="icon-medal"></i>';
    document.getElementById('achievePopupIcon').innerHTML = icon;
    document.getElementById('achievePopupTitle').textContent = achievement.title;
    document.getElementById('achievePopupXp').textContent = `+${achievement.xp_reward || 0} XP`;
    popup.classList.remove('hidden');
    setTimeout(() => popup.classList.add('hidden'), 3500);
  },

  /* ===================================================
     SYNC
     =================================================== */
  /* ===================================================
     SETTINGS
     =================================================== */
  async openSettings() {
    const overlay = document.getElementById('settingsOverlay');
    overlay.classList.remove('hidden');
    // Load saved settings
    try {
      const res = await API.getSettings();
      if (res.ok) {
        const s = res.settings;
        if (s.cf_handle) document.getElementById('settingsCfHandle').value = s.cf_handle;
        if (s.cc_handle) document.getElementById('settingsCcHandle').value = s.cc_handle;
        if (s.ac_handle) document.getElementById('settingsAcHandle').value = s.ac_handle;
        if (s.default_lang) {
          document.getElementById('settingsDefaultLang').value = s.default_lang;
        }
        if (s.font_size) document.getElementById('settingsFontSize').value = s.font_size;
        if (s.tab_size) document.getElementById('settingsTabSize').value = s.tab_size;
        document.getElementById('settingsWordWrap').checked = s.word_wrap === 'true';
        document.getElementById('settingsMinimap').checked = s.minimap === 'true';
        document.getElementById('settingsBracketColor').checked = s.bracket_color !== 'false';
        if (s.time_limit) document.getElementById('settingsTimeLimit').value = s.time_limit;
        document.getElementById('settingsAutoSubmit').checked = s.auto_submit === 'true';
        document.getElementById('settingsCompactSidebar').checked = s.compact_sidebar === 'true';
        document.getElementById('settingsShowXp').checked = s.show_xp !== 'false';
        document.getElementById('settingsSound').checked = s.sound === 'true';
        if (s.ai_difficulty) document.getElementById('settingsAiDifficulty').value = s.ai_difficulty;
        document.getElementById('settingsAiHints').checked = s.ai_hints !== 'false';
      }
    } catch {}
  },

  closeSettings() {
    document.getElementById('settingsOverlay').classList.add('hidden');
  },

  async saveAllSettings() {
    const settings = {
      cf_handle: document.getElementById('settingsCfHandle').value.trim(),
      cc_handle: document.getElementById('settingsCcHandle').value.trim(),
      ac_handle: document.getElementById('settingsAcHandle').value.trim(),
      default_lang: document.getElementById('settingsDefaultLang').value,
      font_size: document.getElementById('settingsFontSize').value,
      tab_size: document.getElementById('settingsTabSize').value,
      word_wrap: document.getElementById('settingsWordWrap').checked ? 'true' : 'false',
      minimap: document.getElementById('settingsMinimap').checked ? 'true' : 'false',
      bracket_color: document.getElementById('settingsBracketColor').checked ? 'true' : 'false',
      time_limit: document.getElementById('settingsTimeLimit').value,
      auto_submit: document.getElementById('settingsAutoSubmit').checked ? 'true' : 'false',
      compact_sidebar: document.getElementById('settingsCompactSidebar').checked ? 'true' : 'false',
      show_xp: document.getElementById('settingsShowXp').checked ? 'true' : 'false',
      sound: document.getElementById('settingsSound').checked ? 'true' : 'false',
      ai_difficulty: document.getElementById('settingsAiDifficulty').value,
      ai_hints: document.getElementById('settingsAiHints').checked ? 'true' : 'false',
    };
    await API.saveSettings(settings);
    this._applySettings(settings);
    this.closeSettings();
    this.toast('Settings saved!', 'success');
  },

  _applySettings(s) {
    // Apply default language
    if (s.default_lang && s.default_lang !== this._currentLang) {
      this.selectLang(s.default_lang);
    }
    // Apply editor settings
    if (this.editor) {
      const opts = {};
      if (s.font_size) opts.fontSize = parseInt(s.font_size);
      if (s.tab_size) opts.tabSize = parseInt(s.tab_size);
      opts.wordWrap = s.word_wrap === 'true' ? 'on' : 'off';
      opts.minimap = { enabled: s.minimap === 'true' };
      opts.bracketPairColorization = { enabled: s.bracket_color !== 'false' };
      this.editor.updateOptions(opts);
    }
    // Apply compact sidebar
    document.getElementById('sidebar').classList.toggle('compact', s.compact_sidebar === 'true');
    // Store for runtime checks
    this._settings = s;
  },

  async _loadAndApplySettings() {
    try {
      const res = await API.getSettings();
      if (res.ok) this._applySettings(res.settings);
    } catch {}
  },

  async syncFromSettings() {
    const btn = document.getElementById('settingsSyncBtn');
    const status = document.getElementById('settingsSyncStatus');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-sm"></span> Syncing...';
    status.textContent = '';
    try {
      status.textContent = 'Fetching Codeforces...';
      const cf = await API.sync('codeforces');
      status.textContent = `CF: ${cf.inserted} new. Fetching CodeChef...`;
      const cc = await API.sync('codechef');
      status.textContent = `Done! Total: ${cc.total} problems`;
      this.toast(`Synced! Total missions: ${cc.total}`, 'success');
    } catch (e) {
      status.textContent = 'Sync error';
      this.toast('Sync failed: ' + e.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="icon-sync"></i> Sync All Problems';
  },

  async exportData() {
    try {
      const [stats, settings] = await Promise.all([API.getStats(), API.getSettings()]);
      const data = { exportedAt: new Date().toISOString(), stats, settings: settings.settings };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'nexora-progress.json'; a.click();
      URL.revokeObjectURL(url);
      this.toast('Progress exported!', 'success');
    } catch (e) { this.toast('Export failed', 'error'); }
  },

  async resetProgress() {
    if (!confirm('This will reset ALL your progress, XP, achievements, and submissions. This cannot be undone. Are you sure?')) return;
    if (!confirm('Are you really sure? Type OK in the next prompt to confirm.')) return;
    try {
      await API._fetch('/api/reset-progress', { method: 'POST' });
      this.toast('All progress has been reset.', 'info');
      this._updateSidebarPlayer();
      this.route();
    } catch (e) { this.toast('Reset failed', 'error'); }
  },

  /* ===================================================
     RESIZER
     =================================================== */
  initResizer() {
    this._initFloatingPanels();
  },

  _initFloatingPanels() {
    const solveLeft   = document.getElementById('solveLeft');
    const bottomPanel = document.getElementById('bottomPanel');
    const leftHandle  = solveLeft?.querySelector('.solve-topbar');
    const botHandle   = bottomPanel?.querySelector('.bottom-panel-header');

    this._makeDraggable(solveLeft, leftHandle);
    this._makeDraggable(bottomPanel, botHandle);
    this._attachResizeEdges(solveLeft);
    this._attachResizeEdges(bottomPanel);
  },

  /* Generic drag — move panel by dragging its handle bar */
  _makeDraggable(panel, handle) {
    if (!panel || !handle) return;
    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button, a, input, select, .bottom-tabs, .tc-nav-btn')) return;
      e.preventDefault();

      const parent = panel.offsetParent || panel.parentElement;
      const pRect  = parent.getBoundingClientRect();
      const elRect = panel.getBoundingClientRect();

      let initLeft = elRect.left - pRect.left;
      let initTop  = elRect.top  - pRect.top;
      panel.style.left   = initLeft + 'px';
      panel.style.top    = initTop  + 'px';
      panel.style.right  = 'auto';
      panel.style.bottom = 'auto';
      panel.classList.add('fp-dragging');

      const startX = e.clientX, startY = e.clientY;
      const onMove = mv => {
        panel.style.left = (initLeft + mv.clientX - startX) + 'px';
        panel.style.top  = (initTop  + mv.clientY - startY) + 'px';
      };
      const onUp = () => {
        panel.classList.remove('fp-dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  },

  /* 8-direction resize — attaches mousedown to every .fp-edge inside panel */
  _attachResizeEdges(panel) {
    if (!panel) return;
    panel.querySelectorAll('.fp-edge').forEach(edge => {
      edge.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();

        const dir = edge.dataset.dir; // 'n','ne','e','se','s','sw','w','nw'
        const par = panel.offsetParent || panel.parentElement;
        const parRect = par.getBoundingClientRect();
        const elRect  = panel.getBoundingClientRect();

        // Snapshot current geometry in explicit px (normalise right/bottom → left/top)
        let initLeft = elRect.left - parRect.left;
        let initTop  = elRect.top  - parRect.top;
        let initW    = elRect.width;
        let initH    = elRect.height;

        panel.style.left   = initLeft + 'px';
        panel.style.top    = initTop  + 'px';
        panel.style.right  = 'auto';
        panel.style.bottom = 'auto';
        panel.style.width  = initW + 'px';
        panel.style.height = initH + 'px';

        const startX = e.clientX, startY = e.clientY;
        const MIN_W = 200, MIN_H = 80;

        panel.classList.add('fp-dragging');

        const onMove = mv => {
          const dx = mv.clientX - startX;
          const dy = mv.clientY - startY;

          let newLeft = initLeft, newTop = initTop, newW = initW, newH = initH;

          // Horizontal
          if (dir.includes('e')) {
            newW = Math.max(MIN_W, initW + dx);
          }
          if (dir.includes('w')) {
            const clamped = Math.min(initW - MIN_W, dx);
            newLeft = initLeft + clamped;
            newW    = initW    - clamped;
          }
          // Vertical
          if (dir.includes('s')) {
            newH = Math.max(MIN_H, initH + dy);
          }
          if (dir === 'n' || dir === 'ne' || dir === 'nw') {
            const clamped = Math.min(initH - MIN_H, dy);
            newTop = initTop + clamped;
            newH   = initH   - clamped;
          }

          panel.style.left   = newLeft + 'px';
          panel.style.top    = newTop  + 'px';
          panel.style.width  = newW    + 'px';
          panel.style.height = newH    + 'px';

          // Restore minimized state if user drags taller
          if (newH > 120) panel.classList.remove('float-minimized');
          if (window._monacoEditor) window._monacoEditor.layout();
        };

        const onUp = () => {
          panel.classList.remove('fp-dragging');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  },

  /* Panel collapse toggles */
  toggleSolveHud() {
    const hud = document.getElementById('solveHud');
    const btn = document.getElementById('hudMinBtn');
    if (!hud) return;
    const collapsed = hud.classList.toggle('hud-collapsed');
    if (btn) btn.classList.toggle('rotated', collapsed);
    if (btn) btn.title = collapsed ? 'Restore HUD' : 'Minimize HUD';
  },

  /* Minimize problem panel to title bar only */
  toggleLeftPanel() {
    const panel = document.getElementById('solveLeft');
    if (!panel) return;
    const minimized = panel.classList.toggle('float-minimized');
    const btn = document.getElementById('leftCollapseBtn');
    if (btn) btn.title = minimized ? 'Restore panel' : 'Minimize panel';
    if (minimized) {
      // Snap height to just the title bars
      panel.style.height = '80px';
    } else {
      panel.style.height = panel.dataset.prevH || 'calc(100% - 32px)';
    }
  },

  /* Minimize test panel to header bar only */
  toggleBottomPanel() {
    const panel = document.getElementById('bottomPanel');
    if (!panel) return;
    const minimized = panel.classList.toggle('float-minimized');
    const btn = document.getElementById('bottomCollapseBtn');
    if (btn) btn.title = minimized ? 'Restore test panel' : 'Minimize';
    if (minimized) {
      panel.dataset.prevH = panel.offsetHeight + 'px';
      panel.style.height = '38px';
    } else {
      panel.style.height = panel.dataset.prevH || '280px';
    }
  },

  /* Show / hide problem panel from toolbar button */
  toggleProblemPanel() {
    const panel = document.getElementById('solveLeft');
    const btn   = document.getElementById('probPanelBtn');
    if (!panel) return;
    const hidden = panel.classList.toggle('float-hidden');
    if (btn) btn.classList.toggle('fp-hidden-indicator', hidden);
    if (btn) btn.title = hidden ? 'Show problem panel' : 'Hide problem panel';
  },

  /* Show / hide test panel from toolbar button */
  toggleTestPanel() {
    const panel = document.getElementById('bottomPanel');
    const btn   = document.getElementById('tcPanelBtn');
    if (!panel) return;
    const hidden = panel.classList.toggle('float-hidden');
    if (btn) btn.classList.toggle('fp-hidden-indicator', hidden);
    if (btn) btn.title = hidden ? 'Show test panel' : 'Hide test panel';
  },

  /* ===================================================
     KEYS
     =================================================== */
  handleKeys(e) {
    // Command palette: Cmd/Ctrl + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      this.openCmdPalette();
      return;
    }
    // Focus mode: Cmd/Ctrl + Shift + F
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      this.toggleFocusMode();
      return;
    }
    // Submit: Cmd/Ctrl + Shift + Enter
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      if (!document.getElementById('solveOverlay').classList.contains('hidden')) this.submitCode();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!document.getElementById('solveOverlay').classList.contains('hidden')) this.runCode();
    }
    // Number navigation: Cmd/Ctrl + 1-5
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
      const pages = ['dashboard', 'problems', 'nexus', 'ailab', 'learn'];
      const idx = parseInt(e.key) - 1;
      if (pages[idx]) {
        e.preventDefault();
        location.hash = '#/' + pages[idx];
      }
      return;
    }
    if (e.key === 'Escape') {
      // Close in priority order
      if (!document.getElementById('cmdPalette').classList.contains('hidden')) { this.closeCmdPalette(); return; }
      if (!document.getElementById('shortcutsOverlay').classList.contains('hidden')) { this.closeShortcuts(); return; }
      if (!document.getElementById('solveOverlay').classList.contains('hidden')) this.closeSolve();
    }
    // ? key for shortcuts (only when not typing in input)
    if (e.key === '?' && !e.target.closest('input, textarea, [contenteditable]') && !e.ctrlKey && !e.metaKey) {
      this.openShortcuts();
    }
  },

  /* ===================================================
     HELPERS
     =================================================== */
  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _ratingBadge(rating) {
    return `<span class="difficulty-badge ${this._ratingClass(rating)}">${rating || '\u2014'}</span>`;
  },

  _ratingClass(r) {
    if (!r) return 'rating-newbie';
    if (r < 1000) return 'rating-newbie';
    if (r < 1200) return 'rating-pupil';
    if (r < 1400) return 'rating-specialist';
    if (r < 1600) return 'rating-expert';
    if (r < 1900) return 'rating-cm';
    if (r < 2100) return 'rating-master';
    return 'rating-gm';
  },

  _timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  },

  _defaultCode(lang) {
    const l = lang || this._currentLang || 'cpp';
    const templates = {
      cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Your solution here
    
    return 0;
}
`,
      python: `import sys
input = sys.stdin.readline

def solve():
    # Your solution here
    pass

solve()
`,
      java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        
        // Your solution here
        
    }
}
`,
      javascript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];

rl.on('line', line => lines.push(line));
rl.on('close', () => {
    // Your solution here
    
});
`,
    };
    return templates[l] || templates.cpp;
  },

  /* ===== LANGUAGE SELECTOR ===== */
  toggleLangMenu() {
    const menu = document.getElementById('langMenu');
    menu.classList.toggle('hidden');
    // Close on outside click
    if (!menu.classList.contains('hidden')) {
      const close = (e) => {
        if (!e.target.closest('.lang-selector')) {
          menu.classList.add('hidden');
          document.removeEventListener('click', close);
        }
      };
      setTimeout(() => document.addEventListener('click', close), 0);
    }
  },

  selectLang(lang) {
    if (lang === this._currentLang) {
      document.getElementById('langMenu').classList.add('hidden');
      return;
    }
    this._currentLang = lang;
    // Update selector button
    document.getElementById('langIcon').className = this._langIconMap[lang];
    document.getElementById('langLabel').textContent = this._langLabelMap[lang];
    // Update active state in menu
    document.querySelectorAll('.lang-option').forEach(el => {
      el.classList.toggle('active', el.dataset.lang === lang);
    });
    document.getElementById('langMenu').classList.add('hidden');
    // Switch editor language and template
    if (this.editor) {
      const model = this.editor.getModel();
      monaco.editor.setModelLanguage(model, this._monacoLangMap[lang]);
      this.editor.setValue(this._defaultCode(lang));
    }
  },

  /* ===================================================
     CUSTOMIZE PANEL — Drag-to-reorder + toggle sections
     =================================================== */
  _customizeLayout: null,
  _customizeDragIdx: null,

  async _openCustomizePanel() {
    const layoutData = await API.getDashboardLayout();
    const layout = layoutData.ok ? layoutData.layout : {};
    const defaultOrder = this._hubSections.map(s => s.key);
    const order = Array.isArray(layout._order) ? layout._order.filter(k => defaultOrder.includes(k)) : [...defaultOrder];
    for (const k of defaultOrder) { if (!order.includes(k)) order.push(k); }

    this._customizeLayout = { ...layout, _order: order };

    const overlay = document.createElement('div');
    overlay.className = 'customize-overlay';
    overlay.id = 'customizeOverlay';
    overlay.onclick = (e) => { if (e.target === overlay) this._closeCustomizePanel(); };

    overlay.innerHTML = `
      <div class="customize-panel">
        <div class="customize-header">
          <div>
            <h2><i class="icon-dashboard" style="font-size:20px"></i> Customize Layout</h2>
            <p>Toggle sections on/off and drag to reorder</p>
          </div>
          <button class="customize-close" onclick="App._closeCustomizePanel()"><i class="icon-cross"></i></button>
        </div>
        <div class="customize-body" id="customizeBody"></div>
        <div class="customize-footer">
          <button class="btn btn-ghost btn-sm" onclick="App._resetCustomizeLayout()"><i class="icon-reset" style="font-size:12px"></i> Reset to Default</button>
          <div class="customize-footer-right">
            <button class="btn btn-secondary btn-sm" onclick="App._closeCustomizePanel()">Cancel</button>
            <button class="btn btn-primary btn-sm" onclick="App._saveCustomizeLayout()"><i class="icon-check" style="font-size:12px"></i> Apply</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    this._renderCustomizeItems();
  },

  _renderCustomizeItems() {
    const body = document.getElementById('customizeBody');
    if (!body) return;
    const layout = this._customizeLayout;
    const order = layout._order;
    const sectionMap = {};
    for (const s of this._hubSections) sectionMap[s.key] = s;

    body.innerHTML = order.map((key, idx) => {
      const sec = sectionMap[key];
      if (!sec) return '';
      const enabled = layout[key] !== false;
      return `
        <div class="customize-item ${enabled ? '' : 'disabled'}" data-key="${key}" data-idx="${idx}"
             draggable="true"
             ondragstart="App._custDragStart(event, ${idx})"
             ondragover="App._custDragOver(event, ${idx})"
             ondrop="App._custDrop(event, ${idx})"
             ondragend="App._custDragEnd(event)">
          <div class="customize-drag-handle">⠿</div>
          <div class="customize-item-icon"><i class="${sec.icon}"></i></div>
          <div class="customize-item-info">
            <div class="customize-item-label">${sec.label}</div>
            <div class="customize-item-desc">${sec.desc}</div>
          </div>
          <label class="customize-toggle">
            <input type="checkbox" ${enabled ? 'checked' : ''} onchange="App._custToggle('${key}', this.checked)">
            <span class="customize-toggle-slider"></span>
          </label>
        </div>`;
    }).join('');
  },

  _custToggle(key, checked) {
    this._customizeLayout[key] = checked;
    this._renderCustomizeItems();
  },

  _custDragStart(e, idx) {
    this._customizeDragIdx = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.target.closest('.customize-item').classList.add('dragging');
  },

  _custDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const items = document.querySelectorAll('.customize-item');
    items.forEach((item, i) => {
      item.classList.remove('drag-over-above', 'drag-over-below');
      if (i === idx && this._customizeDragIdx !== idx) {
        item.classList.add(this._customizeDragIdx < idx ? 'drag-over-below' : 'drag-over-above');
      }
    });
  },

  _custDrop(e, dropIdx) {
    e.preventDefault();
    const dragIdx = this._customizeDragIdx;
    if (dragIdx == null || dragIdx === dropIdx) return;
    const order = this._customizeLayout._order;
    const [moved] = order.splice(dragIdx, 1);
    order.splice(dropIdx, 0, moved);
    this._customizeDragIdx = null;
    this._renderCustomizeItems();
  },

  _custDragEnd(e) {
    this._customizeDragIdx = null;
    document.querySelectorAll('.customize-item').forEach(item => {
      item.classList.remove('dragging', 'drag-over-above', 'drag-over-below');
    });
  },

  _resetCustomizeLayout() {
    const defaultOrder = this._hubSections.map(s => s.key);
    this._customizeLayout = { _order: [...defaultOrder] };
    this._renderCustomizeItems();
  },

  async _saveCustomizeLayout() {
    await API.saveDashboardLayout(this._customizeLayout);
    this._closeCustomizePanel();
    this.toast('Layout updated', 'success');
    this.renderHub(document.getElementById('pageContent'));
  },

  _closeCustomizePanel() {
    const overlay = document.getElementById('customizeOverlay');
    if (overlay) {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 200);
    }
    this._customizeLayout = null;
  },

  /* ===================================================
     COMMAND PALETTE
     =================================================== */
  _buildCmdItems() {
    return [
      { type: 'nav', label: 'HQ', desc: 'cd ~/command_center', icon: 'icon-dashboard', action: () => { location.hash = '#/hub'; } },
      { type: 'nav', label: 'Problems', desc: 'grep -r "challenge"', icon: 'icon-problems', action: () => { location.hash = '#/problems'; } },
      { type: 'nav', label: 'Progress', desc: 'cat stats.log', icon: 'icon-arena', action: () => { location.hash = '#/nexus'; } },
      { type: 'nav', label: 'Contests', desc: './arena --live', icon: 'icon-contests', action: () => { location.hash = '#/contests'; } },
      { type: 'nav', label: 'AI Lab', desc: 'python3 neural.py', icon: 'icon-neural', action: () => { location.hash = '#/ailab'; } },
      { type: 'nav', label: 'Learn', desc: 'import knowledge', icon: 'icon-learn', action: () => { location.hash = '#/learn'; } },
      { type: 'nav', label: 'The Forge', desc: 'make build', icon: 'icon-hammer', action: () => { location.hash = '#/forge'; } },
      { type: 'nav', label: 'Workshop', desc: 'vim sandbox.cpp', icon: 'icon-code', action: () => { location.hash = '#/workshop'; } },
      { type: 'nav', label: 'Squad', desc: 'ssh party@nexus', icon: 'icon-friends', action: () => { location.hash = '#/social'; } },
      { type: 'action', label: './config', desc: 'open settings panel', icon: 'icon-settings', action: () => { this.openSettings(); } },
      { type: 'action', label: 'git pull', desc: 'sync from OJs', icon: 'icon-sync', action: () => { this._autoSync(); } },
      { type: 'action', label: 'shortcuts', desc: 'view keybinds', icon: 'icon-bolt', action: () => { this.openShortcuts(); } },
      { type: 'action', label: 'zen mode', desc: 'toggle focus mode', icon: 'icon-focus', action: () => { this.toggleFocusMode(); } },
    ];
  },

  openCmdPalette() {
    const el = document.getElementById('cmdPalette');
    el.classList.remove('hidden');
    const input = document.getElementById('cmdInput');
    input.value = '';
    input.focus();
    this._cmdSelectedIdx = 0;
    this._renderCmdResults('');
    input.oninput = () => this._renderCmdResults(input.value);
    input.onkeydown = e => this._cmdKeyDown(e);
  },

  closeCmdPalette() {
    document.getElementById('cmdPalette').classList.add('hidden');
  },

  _renderCmdResults(query) {
    const items = this._buildCmdItems();
    const q = query.toLowerCase().trim();
    const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)) : items;
    this._cmdFiltered = filtered;
    if (this._cmdSelectedIdx >= filtered.length) this._cmdSelectedIdx = Math.max(0, filtered.length - 1);

    const container = document.getElementById('cmdResults');
    if (!filtered.length) {
      container.innerHTML = '<div class="cmd-empty">No results found</div>';
      return;
    }

    let lastType = '';
    let html = '';
    filtered.forEach((item, i) => {
      if (item.type !== lastType) {
        lastType = item.type;
        html += `<div class="cmd-section-label">${item.type === 'nav' ? 'Navigation' : 'Actions'}</div>`;
      }
      html += `<div class="cmd-result ${i === this._cmdSelectedIdx ? 'active' : ''}" data-idx="${i}" onmouseenter="App._cmdHover(${i})" onclick="App._cmdExec(${i})">
        <i class="${item.icon} cmd-result-icon"></i>
        <div class="cmd-result-text">
          <span class="cmd-result-label">${item.label}</span>
          <span class="cmd-result-desc">${item.desc}</span>
        </div>
        <kbd class="cmd-kbd-sm">↵</kbd>
      </div>`;
    });
    container.innerHTML = html;

    // Scroll active into view
    const activeEl = container.querySelector('.cmd-result.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  },

  _cmdHover(idx) {
    this._cmdSelectedIdx = idx;
    const container = document.getElementById('cmdResults');
    container.querySelectorAll('.cmd-result').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });
  },

  _cmdKeyDown(e) {
    const filtered = this._cmdFiltered || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._cmdSelectedIdx = Math.min(this._cmdSelectedIdx + 1, filtered.length - 1);
      this._renderCmdResults(document.getElementById('cmdInput').value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._cmdSelectedIdx = Math.max(this._cmdSelectedIdx - 1, 0);
      this._renderCmdResults(document.getElementById('cmdInput').value);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this._cmdExec(this._cmdSelectedIdx);
    } else if (e.key === 'Escape') {
      this.closeCmdPalette();
    }
  },

  _cmdExec(idx) {
    const filtered = this._cmdFiltered || [];
    if (filtered[idx]) {
      this.closeCmdPalette();
      filtered[idx].action();
    }
  },

  /* ===================================================
     KEYBOARD SHORTCUTS OVERLAY
     =================================================== */
  openShortcuts() {
    const el = document.getElementById('shortcutsOverlay');
    el.classList.remove('hidden');
    const body = document.getElementById('shortcutsBody');
    const isMac = navigator.platform.includes('Mac');
    const mod = isMac ? '⌘' : 'Ctrl';

    const shortcuts = [
      { section: 'General', items: [
        { keys: `${mod} + K`, desc: 'Open Command Palette' },
        { keys: '?', desc: 'Show Keyboard Shortcuts' },
        { keys: `${mod} + ⇧ + F`, desc: 'Toggle Focus Mode' },
        { keys: 'Esc', desc: 'Close overlay / modal' },
      ]},
      { section: 'Editor', items: [
        { keys: `${mod} + ↵`, desc: 'Run Code' },
        { keys: `${mod} + ⇧ + ↵`, desc: 'Submit Code' },
      ]},
      { section: 'Navigation', items: [
        { keys: `${mod} + 1`, desc: 'Dashboard' },
        { keys: `${mod} + 2`, desc: 'Problems' },
        { keys: `${mod} + 3`, desc: 'Progress' },
        { keys: `${mod} + 4`, desc: 'AI Lab' },
        { keys: `${mod} + 5`, desc: 'Learn' },
      ]},
    ];

    body.innerHTML = shortcuts.map(s => `
      <div class="sc-section">
        <div class="sc-section-title">${s.section}</div>
        ${s.items.map(i => `
          <div class="sc-row">
            <div class="sc-keys">${i.keys.split(' + ').map(k => `<kbd class="sc-key">${k}</kbd>`).join('<span class="sc-plus">+</span>')}</div>
            <div class="sc-desc">${i.desc}</div>
          </div>
        `).join('')}
      </div>
    `).join('');
  },

  closeShortcuts() {
    document.getElementById('shortcutsOverlay').classList.add('hidden');
  },

  /* ===================================================
     CONFETTI CELEBRATION
     =================================================== */
  _fireConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#1d4ed8', '#059669', '#14b8a6', '#d4a017', '#fbbf24', '#10b981', '#f59e0b', '#3b82f6'];
    const particles = [];

    for (let i = 0; i < 180; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 300,
        y: canvas.height * 0.6,
        vx: (Math.random() - 0.5) * 24,
        vy: -Math.random() * 20 - 8,
        w: Math.random() * 10 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 18,
        gravity: 0.35 + Math.random() * 0.2,
        alpha: 1,
        decay: 0.004 + Math.random() * 0.008,
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rot += p.rotV;
        p.alpha -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) requestAnimationFrame(animate);
      else canvas.remove();
    }
    requestAnimationFrame(animate);
  },

  /* ===================================================
     FOCUS MODE
     =================================================== */
  toggleFocusMode() {
    const solveOv = document.getElementById('solveOverlay');
    const isSolving = solveOv && !solveOv.classList.contains('hidden');

    if (isSolving) {
      // Solve zen mode — collapse everything except the editor
      this._focusMode = !this._focusMode;
      solveOv.classList.toggle('solve-zen', this._focusMode);
      const zenBar = document.getElementById('zenRestoreBar');
      if (zenBar) zenBar.classList.toggle('hidden', !this._focusMode);
      const btn = document.getElementById('focusModeBtn');
      if (btn) btn.classList.toggle('zen-active', this._focusMode);
      if (btn) btn.title = this._focusMode ? 'Exit Zen Mode (⌘⇧F)' : 'Zen Mode (⌘⇧F)';
      // Monaco needs a relayout after panels animate away
      setTimeout(() => { if (window._monacoEditor) window._monacoEditor.layout(); }, 320);
      this.toast(this._focusMode ? '[ ZEN MODE ] — pure focus' : '[ ZEN MODE ] off', 'info');
      return;
    }

    // Outside solve: regular sidebar focus mode
    this._focusMode = !this._focusMode;
    document.getElementById('sidebar').classList.toggle('focus-hidden', this._focusMode);
    document.getElementById('mainContent').classList.toggle('focus-expand', this._focusMode);
    const btn = document.getElementById('focusModeBtn');
    if (btn) btn.classList.toggle('active', this._focusMode);
    this.toast(this._focusMode ? 'Focus mode on — distraction-free' : 'Focus mode off', 'info');
  },

  toast(msg, type = 'info') {
    const container = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="icon-${type === 'success' ? 'check' : type === 'error' ? 'cross' : 'bolt'}" style="font-size:14px"></i> ${this._esc(msg)}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
