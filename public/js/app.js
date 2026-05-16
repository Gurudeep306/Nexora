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
  _langs: window.NEXORA_APP_CONFIG?.langs || [],
  _langGroups: window.NEXORA_APP_CONFIG?.langGroups || {},

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
  _renderAvatar(avatar, avatarUrl) {
    if (avatarUrl) return `<img src="${avatarUrl}" class="avatar-img" alt="avatar"/>`;
    const cls = this._avatarIconMap[avatar];
    if (cls) return `<i class="${cls}"></i>`;
    if (avatar && avatar.length <= 4) return avatar;
    return `<i class="icon-avatar-coder"></i>`;
  },

  /* ===== RIFT LEVEL BADGE SVGs — elite premium designs ===== */
  _riftBadgeSVGs: {
    // L1: Bit — Bronze circuit board fragment, raw silicon
    1: () => {const id=`rb1_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a8a29e"/><stop offset="50%" stop-color="#78716c"/><stop offset="100%" stop-color="#57534e"/></linearGradient><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d6d3d1"/><stop offset="100%" stop-color="#a8a29e"/></linearGradient><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/></filter></defs><rect x="14" y="14" width="52" height="52" rx="6" fill="url(#${id}a)" stroke="url(#${id}b)" stroke-width="2" filter="url(#${id}s)"/><rect x="20" y="20" width="40" height="40" rx="3" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.8"/><g stroke="#a8a29e" stroke-width="1.5" stroke-linecap="round"><line x1="14" y1="28" x2="6" y2="28"/><line x1="14" y1="36" x2="6" y2="36"/><line x1="14" y1="44" x2="6" y2="44"/><line x1="66" y1="28" x2="74" y2="28"/><line x1="66" y1="36" x2="74" y2="36"/><line x1="66" y1="44" x2="74" y2="44"/><line x1="28" y1="14" x2="28" y2="6"/><line x1="40" y1="14" x2="40" y2="6"/><line x1="52" y1="14" x2="52" y2="6"/><line x1="28" y1="66" x2="28" y2="74"/><line x1="40" y1="66" x2="40" y2="74"/><line x1="52" y1="66" x2="52" y2="74"/></g><path d="M30 30 L30 35 L35 35 M50 30 L50 35 L45 35 M30 50 L30 45 L35 45 M50 50 L50 45 L45 45" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/><circle cx="40" cy="40" r="3" fill="#d6d3d1" opacity="0.4"/><text x="40" y="43" text-anchor="middle" font-size="12" font-weight="900" fill="#e7e5e4" font-family="monospace" letter-spacing="1">BIT</text></svg>`;},

    // L2: Byte — Emerald terminal console with scrolling code
    2: () => {const id=`rb2_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1a2e"/><stop offset="100%" stop-color="#0a0a15"/></linearGradient><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#16a34a"/></linearGradient><filter id="${id}g"><feGaussianBlur stdDeviation="2"/></filter><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/></filter></defs><rect x="8" y="10" width="64" height="52" rx="6" fill="url(#${id}a)" stroke="#4ade80" stroke-width="1.5" filter="url(#${id}s)"/><rect x="8" y="58" width="64" height="8" rx="3" fill="#111827" stroke="#4ade80" stroke-width="0.5"/><circle cx="40" cy="62" r="2" fill="#1f2937" stroke="#4ade80" stroke-width="0.5"/><rect x="13" y="14" width="54" height="42" rx="2" fill="#020617"/><rect x="13" y="14" width="54" height="42" rx="2" fill="none" stroke="rgba(74,222,128,0.15)" stroke-width="0.5"/><g font-family="monospace" fill="#4ade80" opacity="0.4" font-size="5"><text x="16" y="22">$ gcc -O2 main.c</text><text x="16" y="29">$ ./a.out</text><text x="16" y="36" opacity="0.3">running tests...</text></g><text x="16" y="46" font-size="14" font-weight="900" fill="#86efac" font-family="monospace">BYTE</text><rect x="56" y="43" width="8" height="2" rx="1" fill="#4ade80"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/></rect><circle cx="18" cy="14" r="0" fill="#4ade80" opacity="0.15"><animate attributeName="r" values="0;30;0" dur="3s" repeatCount="indefinite"/></circle></svg>`;},

    // L3: Kilobyte — Emerald hexagonal gem with prismatic facets
    3: () => {const id=`rb3_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="30%" stop-color="#34d399"/><stop offset="60%" stop-color="#059669"/><stop offset="100%" stop-color="#047857"/></linearGradient><linearGradient id="${id}b" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#a7f3d0"/><stop offset="100%" stop-color="#059669"/></linearGradient><filter id="${id}g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#059669" flood-opacity="0.4"/></filter></defs><polygon points="40,4 68,20 68,52 40,68 12,52 12,20" fill="url(#${id}a)" stroke="url(#${id}b)" stroke-width="2" filter="url(#${id}s)"/><polygon points="40,4 68,20 40,36 12,20" fill="rgba(255,255,255,0.12)"/><polygon points="40,36 68,20 68,52 40,68" fill="rgba(0,0,0,0.08)"/><polygon points="40,36 12,20 12,52 40,68" fill="rgba(0,0,0,0.15)"/><polygon points="40,16 56,26 56,46 40,56 24,46 24,26" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/><line x1="40" y1="4" x2="40" y2="68" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/><line x1="12" y1="20" x2="68" y2="52" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/><line x1="68" y1="20" x2="12" y2="52" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/><circle cx="40" cy="36" r="2" fill="#fff" opacity="0.5"><animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite"/></circle><text x="40" y="33" text-anchor="middle" font-size="7" font-weight="800" fill="#ecfdf5" font-family="monospace" opacity="0.9">KILO</text><text x="40" y="48" text-anchor="middle" font-size="14" font-weight="900" fill="#fff" font-family="monospace">KB</text></svg>`;},

    // L4: Megabyte — Cyan-teal tactical shield with glowing core
    4: () => {const id=`rb4_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#67e8f9"/><stop offset="40%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0891b2"/></linearGradient><linearGradient id="${id}b" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#a5f3fc"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient><radialGradient id="${id}c" cx="50%" cy="40%"><stop offset="0%" stop-color="#cffafe" stop-opacity="0.3"/><stop offset="100%" stop-color="#0891b2" stop-opacity="0"/></radialGradient><filter id="${id}g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#06b6d4" flood-opacity="0.5"/></filter></defs><path d="M40 4 L66 16 L66 44 Q66 62 40 72 Q14 62 14 44 L14 16 Z" fill="url(#${id}a)" stroke="url(#${id}b)" stroke-width="2" filter="url(#${id}s)"/><path d="M40 4 L66 16 L66 44 Q66 62 40 72" fill="rgba(0,0,0,0.08)"/><path d="M40 12 L58 22 L58 42 Q58 56 40 64 Q22 56 22 42 L22 22 Z" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><ellipse cx="40" cy="36" rx="12" ry="12" fill="url(#${id}c)"/><path d="M30 30 L36 30 L36 24 M44 24 L44 30 L50 30 M50 42 L44 42 L44 48 M36 48 L36 42 L30 42" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round"/><circle cx="40" cy="36" r="5" fill="rgba(6,182,212,0.3)" stroke="rgba(255,255,255,0.3)" stroke-width="1"><animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/></circle><text x="40" y="39" text-anchor="middle" font-size="6" font-weight="900" fill="#fff" font-family="monospace">MB</text><g fill="#a5f3fc" opacity="0.5"><circle cx="22" cy="20" r="1"/><circle cx="58" cy="20" r="1"/><circle cx="40" cy="10" r="1.2"/></g></svg>`;},

    // L5: Gigabyte — Royal blue 8-point star with lightning core & particle ring
    5: () => {const id=`rb5_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#93c5fd"/><stop offset="50%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e3a8a"/></linearGradient><radialGradient id="${id}b" cx="50%" cy="50%"><stop offset="0%" stop-color="#bfdbfe" stop-opacity="0.4"/><stop offset="100%" stop-color="#1e40af" stop-opacity="0"/></radialGradient><filter id="${id}g"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#2563eb" flood-opacity="0.5"/></filter></defs><polygon points="40,2 47,24 68,10 56,30 78,40 56,50 68,70 47,56 40,78 33,56 12,70 24,50 2,40 24,30 12,10 33,24" fill="url(#${id}a)" stroke="#93c5fd" stroke-width="1.5" filter="url(#${id}s)"/><circle cx="40" cy="40" r="16" fill="url(#${id}b)"/><circle cx="40" cy="40" r="16" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/><path d="M37 28 L33 39 L38 39 L34 52" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><animate attributeName="opacity" values="1;0.6;1" dur="0.8s" repeatCount="indefinite"/></path><text x="47" y="44" text-anchor="middle" font-size="12" font-weight="900" fill="#fff" font-family="monospace">GB</text><circle cx="40" cy="40" r="22" fill="none" stroke="#60a5fa" stroke-width="0.5" stroke-dasharray="2 4"><animateTransform attributeName="transform" type="rotate" values="0 40 40;360 40 40" dur="12s" repeatCount="indefinite"/></circle></svg>`;},

    // L6: Terabyte — Legendary purple diamond with inner fire & ornate frame
    6: () => {const id=`rb6_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#d8b4fe"/><stop offset="30%" stop-color="#a855f7"/><stop offset="70%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#4c1d95"/></linearGradient><linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e9d5ff"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient><radialGradient id="${id}c" cx="50%" cy="40%"><stop offset="0%" stop-color="#f5f3ff" stop-opacity="0.3"/><stop offset="100%" stop-color="#6d28d9" stop-opacity="0"/></radialGradient><filter id="${id}g"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#7c3aed" flood-opacity="0.5"/></filter></defs><polygon points="40,2 72,40 40,78 8,40" fill="url(#${id}a)" stroke="url(#${id}b)" stroke-width="2" filter="url(#${id}s)"/><polygon points="40,2 72,40 40,40" fill="rgba(255,255,255,0.08)"/><polygon points="40,40 72,40 40,78" fill="rgba(0,0,0,0.1)"/><polygon points="40,14 60,40 40,66 20,40" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><polygon points="40,26 50,40 40,54 30,40" fill="url(#${id}c)"/><line x1="40" y1="2" x2="40" y2="78" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/><line x1="8" y1="40" x2="72" y2="40" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/><circle cx="40" cy="40" r="2" fill="#fff" opacity="0.6"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite"/></circle><text x="40" y="36" text-anchor="middle" font-size="6" font-weight="800" fill="#f5f3ff" font-family="monospace">TERA</text><text x="40" y="50" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="monospace">TB</text><g fill="#c084fc" opacity="0.4"><circle cx="40" cy="8" r="1.5"/><circle cx="66" cy="40" r="1.5"/><circle cx="40" cy="72" r="1.5"/><circle cx="14" cy="40" r="1.5"/></g></svg>`;},

    // L7: Petabyte — Magenta blazing star with pentagonal inner glow
    7: () => {const id=`rb7_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0abfc"/><stop offset="50%" stop-color="#d946ef"/><stop offset="100%" stop-color="#86198f"/></linearGradient><radialGradient id="${id}b" cx="50%" cy="50%"><stop offset="0%" stop-color="#fae8ff" stop-opacity="0.35"/><stop offset="100%" stop-color="#a21caf" stop-opacity="0"/></radialGradient><filter id="${id}g"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#d946ef" flood-opacity="0.5"/></filter></defs><polygon points="40,2 48,26 74,26 53,42 62,68 40,52 18,68 27,42 6,26 32,26" fill="url(#${id}a)" stroke="#f0abfc" stroke-width="1.5" filter="url(#${id}s)"/><polygon points="40,2 48,26 74,26 53,42 40,36" fill="rgba(255,255,255,0.08)"/><polygon points="40,18 45,30 56,30 47,38 50,50 40,44 30,50 33,38 24,30 35,30" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/><circle cx="40" cy="38" r="10" fill="url(#${id}b)"/><circle cx="40" cy="38" r="10" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/><text x="40" y="35" text-anchor="middle" font-size="6" font-weight="800" fill="#fdf4ff" font-family="monospace">PETA</text><text x="40" y="46" text-anchor="middle" font-size="11" font-weight="900" fill="#fff" font-family="monospace">PB</text><circle cx="40" cy="38" r="20" fill="none" stroke="#e879f9" stroke-width="0.4" stroke-dasharray="3 5"><animateTransform attributeName="transform" type="rotate" values="0 40 38;360 40 38" dur="15s" repeatCount="indefinite"/></circle></svg>`;},

    // L8: Exabyte — Crimson dragon eye with slit pupil & flame wisps
    8: () => {const id=`rb8_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><radialGradient id="${id}a" cx="50%" cy="50%"><stop offset="0%" stop-color="#fecaca"/><stop offset="25%" stop-color="#f87171"/><stop offset="60%" stop-color="#dc2626"/><stop offset="100%" stop-color="#7f1d1d"/></radialGradient><radialGradient id="${id}b" cx="50%" cy="50%"><stop offset="0%" stop-color="#fef2f2" stop-opacity="0.2"/><stop offset="100%" stop-color="#991b1b" stop-opacity="0"/></radialGradient><filter id="${id}g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#dc2626" flood-opacity="0.5"/></filter></defs><ellipse cx="40" cy="38" rx="34" ry="22" fill="url(#${id}a)" stroke="#f87171" stroke-width="1.5" filter="url(#${id}s)"/><path d="M8 30 Q16 22 28 20" fill="none" stroke="#fca5a5" stroke-width="0.8" opacity="0.4"/><path d="M72 30 Q64 22 52 20" fill="none" stroke="#fca5a5" stroke-width="0.8" opacity="0.4"/><path d="M10 46 Q18 52 28 54" fill="none" stroke="#fca5a5" stroke-width="0.8" opacity="0.3"/><path d="M70 46 Q62 52 52 54" fill="none" stroke="#fca5a5" stroke-width="0.8" opacity="0.3"/><ellipse cx="40" cy="38" rx="7" ry="18" fill="#1c1917" opacity="0.85"/><ellipse cx="40" cy="38" rx="3.5" ry="14" fill="#0c0a09"/><circle cx="37" cy="30" r="3" fill="rgba(255,255,255,0.25)"/><circle cx="36" cy="29" r="1.2" fill="rgba(255,255,255,0.5)"/><ellipse cx="40" cy="38" rx="34" ry="22" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/><path d="M26 12 Q30 18 32 22" fill="none" stroke="#ef4444" stroke-width="1" opacity="0.3"><animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite"/></path><path d="M54 12 Q50 18 48 22" fill="none" stroke="#ef4444" stroke-width="1" opacity="0.3"><animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.5s" repeatCount="indefinite"/></path><text x="40" y="70" text-anchor="middle" font-size="9" font-weight="900" fill="#fecaca" font-family="monospace" letter-spacing="2">EXA</text></svg>`;},

    // L9: Zettabyte — Atomic nucleus with 3 animated electron orbits & particle effects
    9: () => {const id=`rb9_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><radialGradient id="${id}a" cx="50%" cy="50%"><stop offset="0%" stop-color="#fecaca"/><stop offset="50%" stop-color="#ef4444"/><stop offset="100%" stop-color="#7f1d1d"/></radialGradient><radialGradient id="${id}b" cx="50%" cy="50%"><stop offset="0%" stop-color="#fff" stop-opacity="0.9"/><stop offset="100%" stop-color="#fca5a5" stop-opacity="0.3"/></radialGradient><filter id="${id}g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="#ef4444" flood-opacity="0.5"/></filter></defs><circle cx="40" cy="40" r="36" fill="none" stroke="rgba(239,68,68,0.1)" stroke-width="0.5"/><ellipse cx="40" cy="40" rx="32" ry="12" fill="none" stroke="#ef4444" stroke-width="1.8" filter="url(#${id}g)"><animateTransform attributeName="transform" type="rotate" values="0 40 40;360 40 40" dur="4s" repeatCount="indefinite"/></ellipse><ellipse cx="40" cy="40" rx="32" ry="12" fill="none" stroke="#f87171" stroke-width="1.2"><animateTransform attributeName="transform" type="rotate" values="60 40 40;420 40 40" dur="5.5s" repeatCount="indefinite"/></ellipse><ellipse cx="40" cy="40" rx="32" ry="12" fill="none" stroke="#fca5a5" stroke-width="0.8"><animateTransform attributeName="transform" type="rotate" values="120 40 40;480 40 40" dur="7s" repeatCount="indefinite"/></ellipse><circle cx="40" cy="40" r="8" fill="url(#${id}a)" filter="url(#${id}s)"/><circle cx="40" cy="40" r="4" fill="url(#${id}b)"/><circle cx="40" cy="40" r="2" fill="#fff"><animate attributeName="r" values="1.5;2.5;1.5" dur="1.5s" repeatCount="indefinite"/></circle><g fill="#fca5a5" opacity="0.7"><circle cx="72" cy="40" r="1.5"><animateTransform attributeName="transform" type="rotate" values="0 40 40;360 40 40" dur="4s" repeatCount="indefinite"/></circle><circle cx="56" cy="16" r="1.2"><animateTransform attributeName="transform" type="rotate" values="60 40 40;420 40 40" dur="5.5s" repeatCount="indefinite"/></circle><circle cx="24" cy="64" r="1"><animateTransform attributeName="transform" type="rotate" values="120 40 40;480 40 40" dur="7s" repeatCount="indefinite"/></circle></g><text x="40" y="72" text-anchor="middle" font-size="7" font-weight="900" fill="#fecaca" font-family="monospace" letter-spacing="1">ZETTA</text></svg>`;},

    // L10: Yottabyte — Ornate golden crown with jewels, velvet & filigree
    10: () => {const id=`rb10_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde68a"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#92400e"/></linearGradient><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#d97706"/></linearGradient><linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7f1d1d"/><stop offset="100%" stop-color="#450a0a"/></linearGradient><filter id="${id}g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#f59e0b" flood-opacity="0.5"/></filter></defs><rect x="10" y="50" width="60" height="12" rx="3" fill="url(#${id}a)" stroke="url(#${id}b)" stroke-width="1.5"/><rect x="14" y="52" width="52" height="8" rx="2" fill="url(#${id}v)" opacity="0.3"/><path d="M10 50 L10 28 L22 38 L32 20 L40 14 L48 20 L58 38 L70 28 L70 50 Z" fill="url(#${id}a)" stroke="url(#${id}b)" stroke-width="2" filter="url(#${id}s)"/><path d="M10 28 L22 38 L32 20 L40 14 L40 50 L10 50 Z" fill="rgba(255,255,255,0.06)"/><circle cx="40" cy="18" r="4" fill="#ef4444" stroke="#fde68a" stroke-width="1"><animate attributeName="r" values="3.5;4.5;3.5" dur="2s" repeatCount="indefinite"/></circle><circle cx="24" cy="36" r="3" fill="#3b82f6" stroke="#fde68a" stroke-width="0.8"/><circle cx="56" cy="36" r="3" fill="#22c55e" stroke="#fde68a" stroke-width="0.8"/><circle cx="16" cy="34" r="2" fill="#a855f7" stroke="#fde68a" stroke-width="0.5"/><circle cx="64" cy="34" r="2" fill="#a855f7" stroke="#fde68a" stroke-width="0.5"/><line x1="14" y1="56" x2="66" y2="56" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/><g fill="#fde68a" opacity="0.3"><circle cx="20" cy="55" r="0.8"/><circle cx="30" cy="55" r="0.8"/><circle cx="40" cy="55" r="0.8"/><circle cx="50" cy="55" r="0.8"/><circle cx="60" cy="55" r="0.8"/></g><text x="40" y="74" text-anchor="middle" font-size="7" font-weight="900" fill="#fef3c7" font-family="monospace" letter-spacing="1">YOTTA</text></svg>`;},

    // L11: ∞ Overflow — Ascended infinity halo, divine golden radiance, particle cosmos
    11: () => {const id=`rb11_${Math.random().toString(36).slice(2,7)}`;return `<svg viewBox="0 0 80 80" class="rift-badge-svg"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="25%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="75%" stop-color="#d97706"/><stop offset="100%" stop-color="#fef3c7"/></linearGradient><radialGradient id="${id}b" cx="50%" cy="50%"><stop offset="0%" stop-color="#fefce8" stop-opacity="0.3"/><stop offset="50%" stop-color="#f59e0b" stop-opacity="0.1"/><stop offset="100%" stop-color="#78350f" stop-opacity="0"/></radialGradient><filter id="${id}g"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${id}s"><feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#f59e0b" flood-opacity="0.6"/></filter></defs><circle cx="40" cy="40" r="36" fill="url(#${id}b)"/><circle cx="40" cy="40" r="36" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="3 2" filter="url(#${id}g)"><animateTransform attributeName="transform" type="rotate" values="0 40 40;360 40 40" dur="20s" repeatCount="indefinite"/></circle><circle cx="40" cy="40" r="32" fill="none" stroke="#f59e0b" stroke-width="0.8" stroke-dasharray="6 4"><animateTransform attributeName="transform" type="rotate" values="360 40 40;0 40 40" dur="15s" repeatCount="indefinite"/></circle><circle cx="40" cy="40" r="28" fill="url(#${id}a)" opacity="0.85" filter="url(#${id}s)"/><circle cx="40" cy="40" r="28" fill="none" stroke="#fef3c7" stroke-width="1"/><circle cx="40" cy="40" r="22" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/><path d="M18 40 C18 30 28 26 33 33 C36 37 40 40 40 40 C40 40 44 43 47 47 C52 54 62 50 62 40 C62 30 52 26 47 33 C44 37 40 40 40 40 C40 40 36 43 33 47 C28 54 18 50 18 40 Z" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" filter="url(#${id}g)"/><circle cx="22" cy="40" r="2" fill="#fff" opacity="0.7"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle><circle cx="58" cy="40" r="2" fill="#fff" opacity="0.7"><animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="40" cy="40" r="3" fill="#fff" opacity="0.5"><animate attributeName="r" values="2;4;2" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/></circle><g fill="#fde68a" opacity="0.4"><circle cx="18" cy="18" r="1"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite"/></circle><circle cx="62" cy="18" r="0.8"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="18" cy="62" r="0.8"><animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/></circle><circle cx="62" cy="62" r="1"><animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.5s" repeatCount="indefinite"/></circle><circle cx="40" cy="12" r="0.6"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite"/></circle><circle cx="40" cy="68" r="0.6"><animate attributeName="opacity" values="0.8;0.3;0.8" dur="2.2s" repeatCount="indefinite"/></circle></g><text x="40" y="68" text-anchor="middle" font-size="6" font-weight="900" fill="#fef3c7" font-family="monospace" letter-spacing="2">OVERFLOW</text></svg>`;},
  },

  /* Render a rift badge SVG by level number (1-11), at given size */
  _renderRiftBadge(level, size = 32) {
    const fn = this._riftBadgeSVGs[level];
    if (!fn) return '';
    return `<span class="rift-badge" style="width:${size}px;height:${size}px;display:inline-flex">${fn()}</span>`;
  },

  /* Render avatar with badge overlay — badge sits at bottom-right of avatar */
  _renderAvatarWithBadge(avatar, level, avatarSize = 48, badgeSize = 20, avatarUrl = null) {
    const avatarHtml = this._renderAvatar(avatar, avatarUrl);
    const badgeHtml = this._renderRiftBadge(level, badgeSize);
    return `<span class="avatar-badge-wrap" style="width:${avatarSize}px;height:${avatarSize}px">
      <span class="avatar-badge-icon" style="font-size:${Math.round(avatarSize * 0.5)}px">${avatarHtml}</span>
      <span class="avatar-badge-overlay">${badgeHtml}</span>
    </span>`;
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
  _isAdmin: false,
  _oauthUser: null,

  async init() {
    // Boot screen animation
    this._bootSequence();

    window.addEventListener('hashchange', () => this.route());
    document.addEventListener('keydown', e => this.handleKeys(e));
    this.initResizer();

    await this._initSocial();
    await this._loadAndApplySettings();

    // Check for OAuth callback in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authProvider = urlParams.get('auth');
    const authError = urlParams.get('auth_error');
    
    if (authError) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => this.toast(`Auth error: ${authError.replace(/_/g, ' ')}`, 'error'), 3500);
    }

    if (authProvider) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Fetch OAuth user data from session
      try {
        const authStatus = await API.getAuthStatus();
        if (authStatus.ok && authStatus.authenticated) {
          this._oauthUser = authStatus.user;
        }
      } catch {}
    }

    // Force onboarding if no profile exists
    if (!this._username) {
      setTimeout(() => this._dismissBoot(), 2800);
      setTimeout(() => {
        this.showGateScreen();
        // If we have OAuth data, skip gate and go straight to setup with auto-fill
        if (this._oauthUser) {
          this._gateCreate();
          setTimeout(() => this._handleOAuthComplete(), 500);
        }
      }, 3200);
      return;
    }

    // Check admin status
    try {
      const profile = await API.getUserProfile(this._username);
      if (profile.ok && profile.user?.role === 'admin') {
        this._isAdmin = true;
      }
    } catch {}

    if (!location.hash) location.hash = '#/hub';
    else this.route();
    this._updateSidebarPlayer();
    // Auto-sync problems silently in background on every page load
    this._autoSync();

    // Register autocomplete providers after Monaco loads
    window.monacoReady.then(() => this._registerAutocomplete());

    // Dismiss boot screen after content loads
    setTimeout(() => this._dismissBoot(), 2800);

    // Restore sidebar state
    if (localStorage.getItem('nexora_sidebar_collapsed') === '1') {
      document.getElementById('sidebar')?.classList.add('sidebar-collapsed');
      const btn = document.getElementById('sidebarToggle');
      if (btn) { btn.title = 'Show sidebar'; btn.textContent = '▶'; btn.style.display = 'none'; }
    }
  },

  toggleSidebar(forceOpen) {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    if (forceOpen === true) {
      sb.classList.remove('sidebar-collapsed');
    } else {
      sb.classList.toggle('sidebar-collapsed');
    }
    const collapsed = sb.classList.contains('sidebar-collapsed');
    localStorage.setItem('nexora_sidebar_collapsed', collapsed ? '1' : '0');
    const btn = document.getElementById('sidebarToggle');
    if (btn) {
      btn.title = collapsed ? 'Show sidebar' : 'Hide sidebar';
      btn.innerHTML = collapsed
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="15 18 9 12 15 6"/></svg>';
      btn.style.display = collapsed ? 'none' : '';
    }
  },

  expandSidebar() {
    const sb = document.getElementById('sidebar');
    if (sb && sb.classList.contains('sidebar-collapsed')) this.toggleSidebar(true);
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

    // Auto-expand sidebar on navigation
    this.expandSidebar();

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
      case 'profile':
        if (subId) { this.renderUserProfile(content, subId); }
        else { this.renderUserProfile(content, this._username); }
        break;
      default: this.renderHub(content);
    }
  },

  /* ========== Sidebar Player Card ========== */
  async _updateSidebarPlayer() {
    try {
      const data = await API.getStats(this._username);
      if (!data.ok) return;
      const lvl = data.level;
      document.getElementById('sidebarTitle').textContent = lvl.name;
      document.getElementById('sidebarTitle').style.color = lvl.color;
      if (lvl.glow && lvl.glow !== 'none') document.getElementById('sidebarTitle').style.textShadow = lvl.glow;
      const pct = lvl.xpForNext > 0 ? Math.round(lvl.xpInLevel / lvl.xpForNext * 100) : 100;
      document.getElementById('sidebarXpFill').style.width = pct + '%';
      document.getElementById('sidebarXpFill').style.background = lvl.color;
      document.getElementById('sidebarXpText').textContent = data.totalXp + ' XP';

      // Update rift badge in sidebar
      const badgeEl = document.getElementById('sidebarRiftBadge');
      if (badgeEl) badgeEl.innerHTML = this._renderRiftBadge(lvl.level, 20);

      // Update avatar icon in sidebar
      const avatarEl = document.getElementById('sidebarAvatarIcon');
      if (avatarEl && this._username) {
        try {
          const profile = await API.getUserProfile(this._username);
          if (profile.ok && profile.user) {
            avatarEl.innerHTML = this._renderAvatar(profile.user.avatar, profile.user.avatar_url);
            if (profile.user.role === 'admin') this._isAdmin = true;
          }
        } catch {}
      }

      // Admin crown indicator
      const titleEl = document.getElementById('sidebarTitle');
      if (titleEl && this._isAdmin) {
        titleEl.innerHTML = `<span class="admin-crown">♛</span> ${lvl.name}`;
      }

      // Admin styling on sidebar card
      const sidebarCard = document.getElementById('sidebarPlayerCard');
      if (sidebarCard) {
        if (this._isAdmin) sidebarCard.classList.add('admin-player');
        else sidebarCard.classList.remove('admin-player');
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
    { key: 'quickactions', label: 'launch()', icon: 'icon-rocket', desc: 'Quick start actions & shortcuts' },
    { key: 'today', label: 'daily.log', icon: 'icon-clock', desc: 'Progress rings & goal tracker' },
    { key: 'challenges', label: 'quests[]', icon: 'icon-sword', desc: 'Daily challenge missions' },
    { key: 'recent', label: 'activity.log', icon: 'icon-feed', desc: 'Recent submission feed' },
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
    el.innerHTML = `
      <div class="hub-header">
        <div class="hub-header-left">
          <h1 class="hub-title"><i class="icon-cpu" style="font-size:28px"></i> <span class="glitch" data-text="NEXORA HQ">NEXORA HQ</span></h1>
          <p class="hub-subtitle">sys.init() => boot_sequence(modules: [stats, activity])</p>
        </div>
        <div class="hub-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.openSettings()"><i class="icon-settings" style="font-size:13px"></i> ./config</button>
          <button class="btn btn-secondary btn-sm" onclick="App.syncSolvedProblems()"><i class="icon-sync" style="font-size:13px"></i> git pull</button>
          <button class="btn btn-primary btn-sm" onclick="App._openCustomizePanel()" id="hubCustomizeBtn"><i class="icon-dashboard" style="font-size:13px"></i> layout</button>
        </div>
      </div>
      <div class="hub-content" id="hubContent"></div>`;

    const hubContent = document.getElementById('hubContent');
    await this._renderHubOverview(hubContent);
  },

  async _renderHubProfile(el) {
    el.innerHTML = `
      <div class="profile-page-hero" id="hubProfileHero">
        <div class="profile-hero-left">
          <div class="profile-hero-badge-large" id="profileAvatarBadge"></div>
          <div id="profileRiftBadgeLarge"></div>
        </div>
        <div class="profile-hero-right">
          <div class="profile-hero-name" id="profileHeroName"><i class="icon-profile"></i> Player</div>
          <div class="profile-hero-handle" id="profileHeroHandle">@anonymous</div>
          <div class="profile-hero-bio" id="profileHeroBio"></div>
          <div class="profile-hero-level-tag" id="profileHeroLevelTag"></div>
          <div class="profile-hero-stats" id="hubProfileQuickStats"></div>
        </div>
      </div>
      <div class="card mb-3" id="rankProgressionCard">
        <div class="card-header"><span class="card-title"><i class="icon-star" style="font-size:16px"></i> nexora.progression()</span></div>
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
      </div>`;

    const [stats, settings] = await Promise.all([API.getStats(this._username), API.getSettings()]);
    if (!stats.ok) return;

    // Profile hero identity
    let userAvatar = 'coder', userAvatarUrl = null, displayName = 'Player', handle = 'anonymous', bio = '';
    if (this._username) {
      try {
        const profile = await API.getUserProfile(this._username);
        if (profile.ok && profile.user) {
          userAvatar = profile.user.avatar || 'coder';
          userAvatarUrl = profile.user.avatar_url || null;
          displayName = profile.user.display_name || profile.user.username;
          handle = profile.user.username;
          bio = profile.user.bio || '';
        }
      } catch {}
    }

    // Avatar with badge overlay (large)
    const avatarBadgeEl = document.getElementById('profileAvatarBadge');
    if (avatarBadgeEl) {
      avatarBadgeEl.innerHTML = this._renderAvatarWithBadge(userAvatar, stats.level.level, 96, 36, userAvatarUrl);
    }

    // Large rift badge
    const riftBadgeLargeEl = document.getElementById('profileRiftBadgeLarge');
    if (riftBadgeLargeEl) {
      riftBadgeLargeEl.innerHTML = this._renderRiftBadge(stats.level.level, 56);
    }

    // Name, handle, bio
    const nameEl = document.getElementById('profileHeroName');
    if (nameEl) {
      const adminTag = this._isAdmin ? ' <span class="admin-tag">♛ ADMIN</span>' : '';
      nameEl.innerHTML = `${this._esc(displayName)} ${this._renderRiftBadge(stats.level.level, 22)}${adminTag}`;
    }
    const handleEl = document.getElementById('profileHeroHandle');
    if (handleEl) handleEl.textContent = `@${handle}`;
    const bioEl = document.getElementById('profileHeroBio');
    if (bioEl) bioEl.textContent = bio || '// no bio set';

    // Admin glow on hero section
    if (this._isAdmin) {
      const heroEl = document.getElementById('hubProfileHero');
      if (heroEl) {
        heroEl.classList.add('admin-profile-hero');
        heroEl.insertAdjacentHTML('afterbegin', '<div class="admin-hero-glow"></div>');
      }
    }

    // Level tag
    const levelTagEl = document.getElementById('profileHeroLevelTag');
    if (levelTagEl) {
      levelTagEl.style.color = stats.level.color;
      levelTagEl.style.borderColor = stats.level.color;
      if (stats.level.glow !== 'none') levelTagEl.style.boxShadow = stats.level.glow;
      levelTagEl.innerHTML = `${this._renderRiftBadge(stats.level.level, 16)} Level ${stats.level.level} — ${stats.level.name}`;
    }

    // Quick stats row in hero
    const qsEl = document.getElementById('hubProfileQuickStats');
    if (qsEl) {
      qsEl.innerHTML = `
        <div class="profile-hero-stat"><span class="profile-hero-stat-val">${stats.solved}</span><span class="profile-hero-stat-lbl">Solved</span></div>
        <div class="profile-hero-stat"><span class="profile-hero-stat-val">${stats.accuracy}%</span><span class="profile-hero-stat-lbl">Accuracy</span></div>
        <div class="profile-hero-stat"><span class="profile-hero-stat-val">${stats.totalXp.toLocaleString()}</span><span class="profile-hero-stat-lbl">Total XP</span></div>
        <div class="profile-hero-stat"><span class="profile-hero-stat-val">${stats.streak.current}</span><span class="profile-hero-stat-lbl">Day Streak</span></div>`;
    }

    // Rank Progression
    if (stats.allTitles?.length) {
      const rpEl = document.getElementById('rankProgression');
      const currentLvl = stats.level.level;
      const pct = Math.round(((currentLvl - 1) / (stats.allTitles.length - 1)) * 100);
      let rpHtml = `
        <div class="np-track-wrap">
          <div class="np-track-bg"></div>
          <div class="np-track-fill" style="width:${pct}%"></div>
          <div class="np-track-dots">
            ${stats.allTitles.map((t, i) => {
              const lvlNum = i + 1;
              const reached = currentLvl >= lvlNum;
              const isCurrent = currentLvl === lvlNum;
              return `<div class="np-track-dot ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}" style="${isCurrent ? 'background:' + t.color + ';box-shadow:0 0 8px ' + t.color : ''}"></div>`;
            }).join('')}
          </div>
        </div>
        <div class="badge-showcase-grid">`;
      for (let i = 0; i < stats.allTitles.length; i++) {
        const t = stats.allTitles[i];
        const lvlNum = i + 1;
        const reached = currentLvl >= lvlNum;
        const isCurrent = currentLvl === lvlNum;
        rpHtml += `
          <div class="badge-showcase-card ${reached ? 'reached' : 'locked-badge'} ${isCurrent ? 'current' : ''}" title="Level ${lvlNum}: ${t.title}&#10;${t.min_xp.toLocaleString()} XP · ${(t.min_problems||0).toLocaleString()} solved">
            <div class="badge-showcase-icon">${this._renderRiftBadge(lvlNum, 52)}</div>
            <div class="badge-showcase-level" style="color:${t.color}">L${lvlNum}</div>
            <div class="badge-showcase-name" style="color:${t.color}">${t.title}</div>
            <div class="badge-showcase-req">${t.min_xp > 0 ? t.min_xp.toLocaleString() + ' XP' : 'Starter'}</div>
            <div class="badge-showcase-status ${reached ? 'unlocked' : 'locked'}">
              ${isCurrent ? '<i class="icon-bolt" style="font-size:9px"></i> Active' : reached ? '<i class="icon-check" style="font-size:9px"></i> Done' : '<i class="icon-lock" style="font-size:9px"></i> Locked'}
            </div>
          </div>`;
      }
      rpHtml += '</div>';
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
    // Show skeleton immediately
    el.innerHTML = `
      <div style="padding:0">
        <div class="skeleton-card" style="height:200px;margin-bottom:12px"></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px">
          ${Array.from({length:4}, () => `<div class="skeleton-card" style="height:90px"></div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${Array.from({length:3}, () => `<div class="skeleton-card" style="height:110px"></div>`).join('')}
        </div>
      </div>`;

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
      quickactions: `<div id="quickActionsSection"></div>`,
      today: `<div id="todaySummarySection"></div>`,
      challenges: `<div id="dailyChallengesSection"></div>`,
      recent: `<div id="recentActivitySection"></div>`,
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
            <div id="ratingChartWrap"></div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title"><i class="icon-target" style="font-size:16px"></i> verdict.analysis()</span></div>
            <div id="verdictChartWrap"></div>
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

    // Show skeleton placeholders in HUD while data loads
    document.getElementById('playerHud').innerHTML = `
      <div style="padding:20px 0">
        <div class="skeleton-row" style="justify-content:center;gap:20px;padding:12px 0">
          <div class="skeleton skeleton-avatar" style="width:80px;height:80px;border-radius:50%"></div>
          <div style="flex:0 0 180px;display:flex;flex-direction:column;gap:8px">
            <div class="skeleton skeleton-line medium"></div>
            <div class="skeleton skeleton-line short"></div>
            <div class="skeleton skeleton-line full"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:12px">
          ${Array.from({length:5},()=>`<div class="skeleton skeleton-block" style="flex:1;height:70px;border-radius:8px"></div>`).join('')}
        </div>
      </div>`;

    await this._populateDashboardData();
  },

  /* ===================================================
     DASHBOARD DATA POPULATION (extracted from renderDashboard)
     =================================================== */
  async _populateDashboardData() {

    // Fetch both APIs in parallel
    const [data, perf] = await Promise.all([API.getStats(this._username), API.getPerformance()]);
    if (!data.ok) return;
    const p = perf.ok ? perf : {};

    this._previousAchievements = data.achievements;

    /* ═══════════════════════════════════════════════
       1. HERO HUD — Redesigned with Power Level + Animated Ring
       ═══════════════════════════════════════════════ */
    const lvl = data.level;
    const title = data.title;
    const xpPct = lvl.xpForNext > 0 ? Math.min(Math.round(lvl.xpInLevel / lvl.xpForNext * 100), 100) : 100;
    const probPct = lvl.probsForNext > 0 ? Math.min(Math.round(lvl.probsInLevel / lvl.probsForNext * 100), 100) : 100;
    const nextLvl = p.nextLevel;

    // Compute a composite "power level" score
    const powerLevel = Math.round(
      (data.solved * 10) +
      (data.totalXp * 0.1) +
      (data.streak.current * 50) +
      ((data.accuracy || 0) * 5) +
      ((p.consistencyScore || 0) * 3)
    );

    let gateHtml = '';
    if (title.next) {
      gateHtml = `<div class="hud-gates-v2">
        <div class="hud-gate-v2">
          <div class="hud-gate-label"><i class="icon-bolt" style="font-size:10px;color:var(--brand-light)"></i> XP Progress</div>
          <div class="hud-gate-track"><div class="hud-gate-fill-v2" style="width:${xpPct}%;--gc:${lvl.color}"></div></div>
          <div class="hud-gate-nums">${data.totalXp.toLocaleString()} / ${(data.totalXp + (title.xpToNext || 0)).toLocaleString()}</div>
        </div>
        <div class="hud-gate-v2">
          <div class="hud-gate-label"><i class="icon-check" style="font-size:10px;color:var(--success)"></i> Problem Gate</div>
          <div class="hud-gate-track"><div class="hud-gate-fill-v2" style="width:${probPct}%;--gc:var(--success)"></div></div>
          <div class="hud-gate-nums">${data.solved} / ${data.solved + (title.probsToNext || 0)}</div>
        </div>
      </div>
      <div class="hud-next-rank">
        <span class="hud-next-label">NEXT RANK</span>
        <span class="hud-next-name" style="color:${title.next.color};text-shadow:0 0 12px ${title.next.color}40">${this._esc(title.next.title)}</span>
        ${nextLvl?.daysEstimate != null ? `<span class="hud-next-eta"><i class="icon-clock" style="font-size:10px"></i> ~${nextLvl.daysEstimate}d ETA</span>` : ''}
      </div>`;
    }

    const ringPath = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

    document.getElementById('playerHud').innerHTML = `
      <div class="player-hud-v2">
        <div class="hud-scanline"></div>
        <div class="hud-v2-top">
          <div class="hud-v2-center">
            <div class="hud-power-ring" style="--ring-color:${lvl.color}">
              <svg viewBox="0 0 36 36" class="hud-ring-svg">
                <defs>
                  <linearGradient id="hudRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${lvl.color}"/>
                    <stop offset="100%" stop-color="${lvl.color}88"/>
                  </linearGradient>
                </defs>
                <path d="${ringPath}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2.5"/>
                <path d="${ringPath}" fill="none" stroke="url(#hudRingGrad)" stroke-width="2.5" stroke-dasharray="${xpPct}, 100" stroke-linecap="round" class="hud-ring-fill-anim"/>
              </svg>
              <div class="hud-level-badge-inner" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;animation:levelNumPulse 3s ease-in-out infinite">${this._renderRiftBadge(lvl.level, 72)}</div>
            </div>
            <div class="hud-rank-title" style="color:${lvl.color};text-shadow:0 0 20px ${lvl.color}60">${this._esc(title.current.title)}</div>
            <div class="hud-power-row">
              <span class="hud-power-label">POWER LEVEL</span>
              <span class="hud-power-val counting" data-target="${powerLevel}">${powerLevel.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div class="hud-v2-stats">
          <div class="hud-v2-stat">
            <div class="hud-v2-stat-icon" style="--sc:var(--success)"><i class="icon-check"></i></div>
            <div class="hud-v2-stat-num">${data.solved}</div>
            <div class="hud-v2-stat-lbl">SOLVED</div>
          </div>
          <div class="hud-v2-stat">
            <div class="hud-v2-stat-icon" style="--sc:var(--warning)"><i class="icon-fire"></i></div>
            <div class="hud-v2-stat-num">${data.streak.current}d</div>
            <div class="hud-v2-stat-lbl">STREAK</div>
          </div>
          <div class="hud-v2-stat">
            <div class="hud-v2-stat-icon" style="--sc:var(--info)"><i class="icon-target"></i></div>
            <div class="hud-v2-stat-num">${data.accuracy}%</div>
            <div class="hud-v2-stat-lbl">ACCURACY</div>
          </div>
          <div class="hud-v2-stat">
            <div class="hud-v2-stat-icon" style="--sc:#14b8a6"><i class="icon-trending"></i></div>
            <div class="hud-v2-stat-num">${p.consistencyScore || 0}%</div>
            <div class="hud-v2-stat-lbl">UPTIME</div>
          </div>
          <div class="hud-v2-stat">
            <div class="hud-v2-stat-icon" style="--sc:var(--purple)"><i class="icon-bolt"></i></div>
            <div class="hud-v2-stat-num">${data.totalXp.toLocaleString()}</div>
            <div class="hud-v2-stat-lbl">TOTAL XP</div>
          </div>
        </div>
        <div class="hud-v2-bottom">
          ${gateHtml}
        </div>
      </div>`;

    /* ═══════════════════════════════════════════════
       1b. QUICK ACTIONS — Launch pad for common tasks
       ═══════════════════════════════════════════════ */
    const qaEl = document.getElementById('quickActionsSection');
    if (qaEl) {
      qaEl.innerHTML = `
        <div class="quick-actions-v2 mt-3">
          <div class="qa-card" onclick="App._randomProblem()" data-glow="var(--brand)">
            <div class="qa-icon-wrap" style="--qa-c:var(--brand)"><i class="icon-dice"></i></div>
            <div class="qa-text">
              <div class="qa-title">Random Mission</div>
              <div class="qa-desc">Jump into a random unsolved problem</div>
            </div>
            <div class="qa-arrow"><i class="icon-chevron-right"></i></div>
          </div>
          <div class="qa-card" onclick="location.hash='#/problems'" data-glow="var(--success)">
            <div class="qa-icon-wrap" style="--qa-c:var(--success)"><i class="icon-code"></i></div>
            <div class="qa-text">
              <div class="qa-title">Browse Problems</div>
              <div class="qa-desc">Find your next challenge by topic</div>
            </div>
            <div class="qa-arrow"><i class="icon-chevron-right"></i></div>
          </div>
          <div class="qa-card" onclick="location.hash='#/forge'" data-glow="var(--warning)">
            <div class="qa-icon-wrap" style="--qa-c:var(--warning)"><i class="icon-sword"></i></div>
            <div class="qa-text">
              <div class="qa-title">The Forge</div>
              <div class="qa-desc">Build skills through structured paths</div>
            </div>
            <div class="qa-arrow"><i class="icon-chevron-right"></i></div>
          </div>
          <div class="qa-card" onclick="location.hash='#/contests'" data-glow="var(--purple)">
            <div class="qa-icon-wrap" style="--qa-c:var(--purple)"><i class="icon-trophy"></i></div>
            <div class="qa-text">
              <div class="qa-title">Live Contests</div>
              <div class="qa-desc">Check upcoming and active battles</div>
            </div>
            <div class="qa-arrow"><i class="icon-chevron-right"></i></div>
          </div>
        </div>`;
    }

    /* ═══════════════════════════════════════════════
       2. TODAY'S COMMAND CENTER
       ═══════════════════════════════════════════════ */
    const ts = data.todayStats;
    const dailyGoal = 3;
    const todayPct = Math.min(100, Math.round((ts.solved / dailyGoal) * 100));
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetEmoji = hour < 12 ? '☀️' : hour < 17 ? '⚡' : '🌙';
    const todayEl = document.getElementById('todaySummarySection');
    if (todayEl) {
      const ringPath = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';
      const todayAccuracy = ts.attempted > 0 ? Math.round(ts.solved / ts.attempted * 100) : 0;
      todayEl.innerHTML = `
        <div class="card mt-3 today-summary-card-v2">
          <div class="today-scanline"></div>
          <div class="today-header-v2">
            <div class="today-greeting-v2">
              <span class="today-greeting-emoji">${greetEmoji}</span>
              <div>
                <h2 class="today-greeting-text">${greeting}, Pilot</h2>
                <p class="today-greeting-sub"><span class="terminal-caret">❯</span> session.status() — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
            <div class="today-session-badge">
              <i class="icon-clock" style="font-size:12px"></i>
              <span>Day ${data.streak.current + 1}</span>
            </div>
            <div class="hub-live-clock" id="hubLiveClock"><span class="live-dot"></span><span class="clock-time">--:--:--</span></div>
          </div>
          <div class="today-metrics-v2">
            <div class="today-metric-v2">
              <div class="today-metric-ring">
                <svg viewBox="0 0 36 36" class="today-ring-svg">
                  <path d="${ringPath}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
                  <path d="${ringPath}" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="${todayPct}, 100" stroke-linecap="round" class="today-ring-fill"/>
                </svg>
                <span class="today-ring-val">${ts.solved}</span>
              </div>
              <span class="today-metric-label">Solved</span>
              <span class="today-metric-sub">Goal: ${dailyGoal}/day</span>
            </div>
            <div class="today-metric-v2">
              <div class="today-metric-ring">
                <svg viewBox="0 0 36 36" class="today-ring-svg">
                  <path d="${ringPath}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
                  <path d="${ringPath}" fill="none" stroke="var(--brand)" stroke-width="3" stroke-dasharray="${todayAccuracy}, 100" stroke-linecap="round" class="today-ring-fill"/>
                </svg>
                <span class="today-ring-val">${ts.attempted}</span>
              </div>
              <span class="today-metric-label">Attempted</span>
              <span class="today-metric-sub">${todayAccuracy}% success</span>
            </div>
            <div class="today-metric-v2">
              <div class="today-metric-ring">
                <svg viewBox="0 0 36 36" class="today-ring-svg">
                  <path d="${ringPath}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
                  <path d="${ringPath}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="${Math.min(100, ts.xp)}, 100" stroke-linecap="round" class="today-ring-fill"/>
                </svg>
                <span class="today-ring-val">${ts.xp}</span>
              </div>
              <span class="today-metric-label">XP Earned</span>
              <span class="today-metric-sub">today</span>
            </div>
            <div class="today-metric-v2">
              <div class="today-metric-ring">
                <svg viewBox="0 0 36 36" class="today-ring-svg">
                  <path d="${ringPath}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
                  <path d="${ringPath}" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="${Math.min(100, data.streak.current * 15)}, 100" stroke-linecap="round" class="today-ring-fill"/>
                </svg>
                <span class="today-ring-val">${data.streak.current}</span>
              </div>
              <span class="today-metric-label">Streak</span>
              <span class="today-metric-sub">Best: ${data.streak.best}</span>
            </div>
          </div>
          ${ts.solved >= dailyGoal ? '<div class="today-goal-hit-v2"><i class="icon-shield" style="font-size:16px"></i> <span>Daily objective complete — XP secured</span></div>' : `<div class="today-goal-bar-v2"><div class="today-goal-fill-v2" style="width:${todayPct}%"></div><span>${ts.solved}/${dailyGoal} daily objective</span></div>`}
        </div>`;
      this._startLiveClock('hubLiveClock');
    }

    /* ═══════════════════════════════════════════════
       3. DAILY CHALLENGES (enhanced with tier badges)
       ═══════════════════════════════════════════════ */
    const dcEl = document.getElementById('dailyChallengesSection');
    if (data.dailyChallenges && data.dailyChallenges.length) {
      const tiers = ['Easy', 'Medium', 'Hard'];
      const tierIcons = ['icon-shield', 'icon-bolt', 'icon-fire'];
      const tierColors = ['var(--success)', 'var(--warning)', 'var(--danger)'];
      const tierRewards = [10, 25, 50];
      let dcHtml = `<div class="card mt-3 quest-board-card">
        <div class="card-header">
          <span class="card-title"><i class="icon-sword" style="font-size:16px;color:var(--gold)"></i> Mission Board</span>
          <span class="quest-timer"><i class="icon-clock" style="font-size:11px"></i> Refreshes daily</span>
        </div>
        <div class="quest-grid">`;
      data.dailyChallenges.forEach((dc, i) => {
        const solved = dc.solve_status === 'solved';
        const tierIdx = Math.min(i, 2);
        dcHtml += `
          <div class="quest-card ${solved ? 'quest-completed' : ''} quest-tier-${tiers[tierIdx].toLowerCase()}" onclick="App.openSolve(${dc.id})">
            <div class="quest-tier-badge" style="--tier-c:${tierColors[tierIdx]}">
              <i class="${tierIcons[tierIdx]}" style="font-size:12px"></i>
              <span>${tiers[tierIdx]}</span>
            </div>
            ${solved ? '<div class="quest-check"><i class="icon-check"></i></div>' : ''}
            <div class="quest-title">${this._esc(dc.title)}</div>
            <div class="quest-footer">
              <span class="${this._ratingClass(dc.rating)}">${dc.rating || '?'}</span>
              <span class="quest-reward"><i class="icon-bolt" style="font-size:11px;color:var(--gold)"></i> +${dc.xp_reward || tierRewards[tierIdx]} XP</span>
            </div>
          </div>`;
      });
      dcHtml += '</div></div>';
      dcEl.innerHTML = dcHtml;
    } else {
      dcEl.innerHTML = '<div class="empty-state mt-3"><p>// run `git pull` to sync problem database first</p></div>';
    }

    /* ═══════════════════════════════════════════════
       4. RECENT ACTIVITY — Last submissions feed
       ═══════════════════════════════════════════════ */
    const raEl = document.getElementById('recentActivitySection');
    if (raEl && data.recent && data.recent.length) {
      const recentItems = data.recent.slice(0, 8);
      let raHtml = `<div class="card mt-3 recent-feed-card">
        <div class="card-header">
          <span class="card-title"><i class="icon-feed" style="font-size:16px"></i> activity.log()</span>
          <span class="text-sm text-muted">${data.recent.length} recent</span>
        </div>
        <div class="recent-feed">`;
      recentItems.forEach((sub, i) => {
        const v = (sub.verdict || 'pending').toUpperCase();
        const vClass = v === 'AC' ? 'ac' : v === 'WA' ? 'wa' : v === 'TLE' ? 'tle' : 're';
        const timeAgo = this._timeAgo(sub.submitted_at || sub.created_at);
        raHtml += `<div class="recent-feed-item" style="animation-delay:${i * 0.05}s" onclick="App.openSolve(${sub.problem_id || sub.id})">
          <div class="recent-feed-line"></div>
          <div class="recent-feed-dot ${vClass}"></div>
          <div class="recent-feed-content">
            <div class="recent-feed-title">${this._esc(sub.title || sub.problem_title || 'Problem')}</div>
            <div class="recent-feed-meta">
              <span class="recent-feed-verdict ${vClass}">${v}</span>
              ${sub.rating ? `<span class="${this._ratingClass(sub.rating)}">${sub.rating}</span>` : ''}
              <span class="recent-feed-time">${timeAgo}</span>
            </div>
          </div>
        </div>`;
      });
      raHtml += '</div></div>';
      raEl.innerHTML = raHtml;
    } else if (raEl) {
      raEl.innerHTML = `<div class="card mt-3"><div class="card-header"><span class="card-title"><i class="icon-feed" style="font-size:16px"></i> activity.log()</span></div><div class="empty-state" style="padding:24px"><p>// no recent submissions — start solving to fill the log</p></div></div>`;
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
    const statsGridEl = document.getElementById('statsGrid');
    if (statsGridEl) {
      statsGridEl.innerHTML = `
        ${this._statCard('icon-check', 'green', data.solved, 'Problems Solved')}
        ${this._statCard('icon-bolt', 'purple', data.totalXp.toLocaleString(), 'Total XP')}
        ${this._statCard('icon-target', 'blue', data.accuracy + '%', 'Accuracy')}
        ${this._statCard('icon-fire', 'amber', data.streak.current + ' days', 'Current Streak')}
        ${this._statCard('icon-code', 'brand', data.submissions, 'Submissions')}
        ${this._statCard('icon-trending', 'pink', (p.consistencyScore || 0) + '%', 'Consistency')}`;
      // Trigger count-up animations (stats grid + HUD power level)
      setTimeout(() => this._animateCountUps(), 120);
    }

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
    for (const d2 of (streak.lastWeek || [])) {
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
    if (streakEl) streakEl.innerHTML = streakHtml;

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
    if (document.getElementById('heatmapContainer')) {
      try { this.renderHeatmap(data.heatmap || []); } catch(e) { console.error('heatmap render error:', e); }
    }

    /* ═══════════════════════════════════════════════
       10. CHARTS — Rating & Verdict Doughnuts
       ═══════════════════════════════════════════════ */
    if (document.getElementById('ratingChartWrap')) {
      try { this.renderRatingChart(data.ratingDist || []); } catch(e) { console.error('rating chart error:', e); }
    }
    if (document.getElementById('verdictChartWrap')) {
      try { this.renderVerdictChart(data.verdicts || []); } catch(e) { console.error('verdict chart error:', e); }
    }

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
    document.querySelectorAll('.stat-value.counting[data-target], .hud-power-val.counting[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target);
      if (!target || target <= 0) return;
      const isPower = el.classList.contains('hud-power-val');
      const duration = isPower ? 1200 : 800;
      const start = performance.now();
      el.textContent = '0';
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const cur = Math.round(target * eased);
        el.textContent = isPower ? cur.toLocaleString() : cur;
        if (progress < 1) requestAnimationFrame(step);
        else { el.textContent = isPower ? target.toLocaleString() : target; el.classList.remove('counting'); }
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
    const wrap = document.getElementById('ratingChartWrap');
    if (!wrap) return;
    if (!dist.length) { wrap.innerHTML = '<div class="empty-state" style="padding:20px"><p>// no solved problems yet</p></div>'; return; }
    const tierColors = { Newbie: '#6b7280', Pupil: '#22c55e', Specialist: '#14b8a6', Expert: '#3b82f6', 'Candidate Master': '#059669', Master: '#f59e0b', Grandmaster: '#ef4444' };
    const maxCount = Math.max(...dist.map(d => d.count), 1);
    const total = dist.reduce((s, d) => s + d.count, 0) || 1;
    let html = '<div class="perf-rating-bars" style="padding:12px 16px 16px">';
    for (const r of dist) {
      const barPct = Math.round(r.count / maxCount * 100);
      const sharePct = Math.round(r.count / total * 100);
      const col = tierColors[r.tier] || 'var(--accent)';
      html += `<div class="perf-rbar">
        <span class="perf-rbar-label" style="color:${col}">${this._esc(r.tier)}</span>
        <div class="perf-rbar-track"><div class="perf-rbar-fill" style="width:${barPct}%;background:${col}"></div></div>
        <span class="perf-rbar-count">${r.count} <span style="color:var(--text-muted);font-size:10px">${sharePct}%</span></span>
      </div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
  },

  renderVerdictChart(verdicts) {
    const wrap = document.getElementById('verdictChartWrap');
    if (!wrap) return;
    if (!verdicts.length) { wrap.innerHTML = '<div class="empty-state" style="padding:20px"><p>// no submissions yet</p></div>'; return; }
    const verdictColors = { AC: '#10b981', WA: '#ef4444', TLE: '#f59e0b', RE: '#f97316', CE: '#94a3b8', MLE: '#d4a017', OK: '#3b82f6' };
    const totalV = verdicts.reduce((s, v) => s + v.count, 0) || 1;
    const accuracy = Math.round((verdicts.find(v => v.verdict === 'AC')?.count || 0) / totalV * 100);
    const donutR = 54, donutC = 2 * Math.PI * donutR;
    let donutOffset = 0;
    let svgSlices = '';
    for (const v of verdicts) {
      const dash = (v.count / totalV) * donutC;
      const col = verdictColors[v.verdict] || '#6b7280';
      svgSlices += `<circle cx="72" cy="72" r="${donutR}" fill="none" stroke="${col}" stroke-width="16"
        stroke-dasharray="${dash.toFixed(1)} ${(donutC - dash).toFixed(1)}"
        stroke-dashoffset="${(-donutOffset).toFixed(1)}" transform="rotate(-90 72 72)"
        style="transition:stroke-dashoffset 0.5s"/>`;
      donutOffset += dash;
    }
    let legendHtml = '';
    for (const v of verdicts) {
      const pct = Math.round(v.count / totalV * 100);
      legendHtml += `<div class="perf-donut-item"><span class="perf-dot" style="background:${verdictColors[v.verdict] || '#6b7280'}"></span>${this._esc(v.verdict)} <span class="text-muted">${pct}% (${v.count})</span></div>`;
    }
    wrap.innerHTML = `<div class="perf-donut-wrap" style="padding:12px 16px 16px">
      <svg width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r="${donutR}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="16"/>
        ${svgSlices}
        <text x="72" y="66" text-anchor="middle" fill="var(--text-bright)" font-size="20" font-weight="800">${accuracy}%</text>
        <text x="72" y="82" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-weight="600">ACCURACY</text>
      </svg>
      <div class="perf-donut-legend">${legendHtml}</div>
    </div>`;
  },

  /* ===================================================
     PROBLEMS
     =================================================== */

  async _randomProblem() {
    try {
      const data = await API.getProblems();
      if (!data.ok || !data.problems?.length) {
        this.toast('No problems loaded yet', 'error');
        return;
      }
      const unsolved = data.problems.filter(p => !p.solved);
      const pool = unsolved.length ? unsolved : data.problems;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.id) {
        location.hash = '#/problems';
        setTimeout(() => this._openProblem && this._openProblem(pick), 300);
      }
    } catch {
      location.hash = '#/problems';
    }
  },

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
            <option value="atcoder">AtCoder</option>
            <option value="leetcode">LeetCode</option>
            <option value="spoj">SPOJ</option>
            <option value="euler">Project Euler</option>
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

    // Show skeleton while loading
    const tableEl = document.getElementById('problemsTable');
    if (tableEl && !tableEl.querySelector('table')) {
      tableEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;padding:8px 0">` +
        Array.from({length: 10}, () => `
          <div class="skeleton-row" style="padding:8px 4px">
            <div class="skeleton skeleton-avatar" style="width:28px;height:28px;border-radius:4px"></div>
            <div style="flex:1;display:flex;gap:8px;align-items:center">
              <div class="skeleton skeleton-line short" style="width:40px;height:18px"></div>
              <div class="skeleton skeleton-line" style="flex:1;height:14px"></div>
              <div class="skeleton skeleton-line" style="width:50px;height:18px"></div>
            </div>
          </div>`).join('') + `</div>`;
    }

    const data = await API.getProblems(params);
    if (!data.ok) return;
    s.total = data.total;

    const tbody = data.problems.map(p => {
      const pMap = { codeforces:'CF', codechef:'CC', atcoder:'AC', leetcode:'LC', spoj:'SP', euler:'PE' };
      const cMap = { codeforces:'badge-cf', codechef:'badge-cc', atcoder:'badge-ac', leetcode:'badge-lc', spoj:'badge-sp', euler:'badge-pe' };
      const pBadge = pMap[p.platform] || p.platform.substring(0,2).toUpperCase();
      const pClass = cMap[p.platform] || 'badge-cc';
      return `
      <tr onclick="App.openSolve(${p.id})">
        <td><span class="status-dot ${p.solve_status}"></span></td>
        <td><span class="badge ${pClass}" style="font-size:10px;padding:2px 6px">${pBadge}</span></td>
        <td><span class="problem-title-link">${this._esc(p.title)}</span></td>
        <td>${this._ratingBadge(p.rating)}</td>
        <td class="text-sm text-muted">${p.problem_id}</td>
        <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();App.openSolve(${p.id})"><i class="icon-sword"></i> Solve</button></td>
      </tr>`;
    }).join('');

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
        <div class="card-header"><span class="card-title"><i class="icon-star" style="font-size:16px"></i> Nexora Progression</span></div>
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

    const [stats, settings] = await Promise.all([API.getStats(this._username), API.getSettings()]);

    if (!stats.ok) return;

    // ---- Nexora Progression ----
    if (stats.allTitles?.length) {
      const rpEl = document.getElementById('rankProgression');
      const currentLvl = stats.level.level;
      // Progress track bar at the top
      const pct = Math.round(((currentLvl - 1) / (stats.allTitles.length - 1)) * 100);
      let rpHtml = `
        <div class="np-track-wrap">
          <div class="np-track-bg"></div>
          <div class="np-track-fill" style="width:${pct}%"></div>
          <div class="np-track-dots">
            ${stats.allTitles.map((t, i) => {
              const lvlNum = i + 1;
              const reached = currentLvl >= lvlNum;
              const isCurrent = currentLvl === lvlNum;
              return `<div class="np-track-dot ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}" style="${isCurrent ? 'background:' + t.color + ';box-shadow:0 0 8px ' + t.color : ''}"></div>`;
            }).join('')}
          </div>
        </div>
        <div class="badge-showcase-grid">`;
      for (let i = 0; i < stats.allTitles.length; i++) {
        const t = stats.allTitles[i];
        const lvlNum = i + 1;
        const reached = currentLvl >= lvlNum;
        const isCurrent = currentLvl === lvlNum;
        rpHtml += `
          <div class="badge-showcase-card ${reached ? 'reached' : 'locked-badge'} ${isCurrent ? 'current' : ''}" title="Level ${lvlNum}: ${t.title}&#10;${t.min_xp.toLocaleString()} XP · ${(t.min_problems||0).toLocaleString()} solved">
            <div class="badge-showcase-icon">${this._renderRiftBadge(lvlNum, 52)}</div>
            <div class="badge-showcase-level" style="color:${t.color}">L${lvlNum}</div>
            <div class="badge-showcase-name" style="color:${t.color}">${t.title}</div>
            <div class="badge-showcase-req">${t.min_xp > 0 ? t.min_xp.toLocaleString() + ' XP' : 'Starter'}</div>
            <div class="badge-showcase-status ${reached ? 'unlocked' : 'locked'}">
              ${isCurrent ? '<i class="icon-bolt" style="font-size:9px"></i> Active' : reached ? '<i class="icon-check" style="font-size:9px"></i> Done' : '<i class="icon-lock" style="font-size:9px"></i> Locked'}
            </div>
          </div>`;
      }
      rpHtml += '</div>';
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
        <h1><i class="icon-arena" style="font-size:28px"></i> <span class="glitch" data-text="Nexora Progression">Nexora Progression</span></h1>
        <p>cat /var/log/stats.log | sort -k2 -rn # rank + zones + XP</p>
      </div>
      <div class="tabs">
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
          <div class="hud-level-badge" style="background:transparent;${p.glow !== 'none' ? 'box-shadow:' + p.glow : ''}">${this._renderRiftBadge(p.level, 32)}</div>
          <div>
            <div class="nexus-player-name" style="color:${p.color}">${this._esc(p.name)}</div>
            <div class="text-sm text-muted">${p.xp.toLocaleString()} XP · Zone ${p.level}/${data.zones.length}</div>
          </div>
        </div>
        <div class="lrm-refresh">
          ${(() => {
            const msPerWeek = 7 * 24 * 60 * 60 * 1000;
            const wSeed = roadmap.weekSeed || Math.floor(Date.now() / msPerWeek);
            const nextRefreshMs = (wSeed + 1) * msPerWeek;
            const msLeft = nextRefreshMs - Date.now();
            const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
            const hoursLeft = Math.ceil(msLeft / (60 * 60 * 1000));
            const refreshLabel = daysLeft <= 0 ? 'Refreshes today'
              : daysLeft === 1 ? `Refreshes in ${hoursLeft}h`
              : `Refreshes in ${daysLeft} days`;
            return `<span class="text-sm text-muted"><i class="icon-clock" style="font-size:11px"></i> ${refreshLabel}</span>`;
          })()}
        </div>
      </div>`;

    // Zones with skill nodes + practice problems
    html += '<div class="nexus-zones-list">';
    const riftBadges = {};
    if (data.riftLevels) data.riftLevels.forEach(r => riftBadges[r.level] = r.badge);
    for (const zone of data.zones) {
      const zoneNodes = data.nodes.filter(n => n.zone === zone.level);
      const rm = roadmapByLevel[zone.level];
      const state = zone.completed ? 'completed' : zone.current ? 'current' : zone.locked ? 'locked' : 'unlocked';
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

      // Always render zone content — locked zones show a requirement banner but still list problems
      html += '<div class="nexus-zone-nodes">';

      if (state === 'locked') {
        html += `<div class="nexus-zone-locked-banner"><i class="icon-lock" style="font-size:12px"></i> Requires ${zone.xpRequired.toLocaleString()} XP &amp; ${zone.probsRequired.toLocaleString()} problems solved to progress — browse problems below to prepare</div>`;
      }

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
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;

    // Auto-expand all unlocked/completed/current zones so all reached levels are visible
    el.querySelectorAll('.nexus-zone:not(.locked)').forEach(zone => {
      zone.classList.add('expanded');
    });
    // Auto-expand first topic only for the current zone
    const currentZone = el.querySelector('.nexus-zone.current');
    if (currentZone) {
      const firstTopic = currentZone.querySelector('.lrm-topic');
      if (firstTopic) firstTopic.classList.add('expanded');
      // Scroll to current zone so user lands at their active level
      setTimeout(() => currentZone.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
            ${this._renderRiftBadge(lvl.level, 58)}
            <span class="perf-hero-title" style="margin-top:2px">${this._esc(lvl.name || 'Bit')}</span>
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
          <div class="perf-rank-dot" style="box-shadow:${isCurrent ? '0 0 8px ' + t.color : 'none'}">
            ${this._renderRiftBadge(t.level, 28)}
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
    const catColors = { ml: '#22c55e', dl: '#3b82f6', nlp: '#059669', cv: '#f59e0b', genai: '#d4a017', rl: '#14b8a6' };
    const catIcons = { ml: '<i class="icon-neural"></i>', dl: '<i class="icon-bolt"></i>', nlp: '<i class="icon-chat"></i>', cv: '<i class="icon-eye"></i>', genai: '<i class="icon-spark"></i>', rl: '<i class="icon-gamepad"></i>' };
    const diffClass = p.difficulty === 'beginner' ? 'green' : p.difficulty === 'intermediate' ? 'amber' : 'red';

    // Show the full-screen AI Lab solve overlay
    const overlay = document.getElementById('ailabSolveOverlay');
    overlay.classList.remove('hidden');

    // HUD title
    document.getElementById('ailabHudTitle').innerHTML =
      `<span style="font-weight:700;color:var(--text-bright);font-size:13px;font-family:var(--mono)">${this._esc(p.title)}</span>`;

    // Status badge
    const statusEl = document.getElementById('ailabSolveStatus');
    statusEl.className = `nf-solve-status ${status}`;
    statusEl.innerHTML = status === 'solved'
      ? '<i class="icon-circle-check"></i> Solved'
      : status === 'in-progress' ? '<i class="icon-sync"></i> In Progress'
      : '<i class="icon-square"></i> Unsolved';

    // Problem panel badges
    document.getElementById('ailabProblemBadges').innerHTML =
      `<span style="font-size:12px;font-weight:700;color:${catColors[p.category] || 'var(--brand)'}">${catIcons[p.category] || ''} ${catLabels[p.category] || p.category}</span>
       <span class="ailab-diff ${diffClass}" style="margin-left:8px">${p.difficulty}</span>`;

    // Problem statement content
    document.getElementById('ailabProblemContent').innerHTML = `
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
                  <button class="nf-copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(s.input).replace(/'/g,'\\\'')});App.toast('Copied!','success')" title="Copy"><i class="icon-copy"></i></button>
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
        </div>` : ''}`;

    // Populate I/O panel
    const inputEl = document.getElementById('nfCustomInput');
    if (inputEl) inputEl.value = samples.length ? samples[0].input : '';

    const samplesEl = document.getElementById('nfSampleResults');
    if (samplesEl) {
      samplesEl.innerHTML = samples.map((s, i) => `
        <div class="nf-sample-result" id="nfSampleResult${i}">
          <div class="nf-sr-header"><span>Sample ${i + 1}</span><span class="nf-sr-status"><i class="icon-square"></i> Not tested</span></div>
          <div class="nf-sr-row"><span class="nf-sr-label">Input:</span><pre>${this._esc(s.input)}</pre></div>
          <div class="nf-sr-row"><span class="nf-sr-label">Expected:</span><pre>${this._esc(s.output)}</pre></div>
          <div class="nf-sr-row nf-sr-actual hidden"><span class="nf-sr-label">Got:</span><pre class="nf-sr-got"></pre></div>
        </div>`).join('') +
        (samples.length
          ? `<button class="btn btn-run btn-sm" onclick="App._runAiSamples()" style="margin-top:8px"><i class="icon-run"></i> Run All Samples</button>`
          : '<div class="output-placeholder"><p>No sample test cases for this problem</p></div>');
    }

    // Reset I/O tabs to input
    document.querySelectorAll('.nf-bottom-tab').forEach(b => b.classList.remove('active'));
    document.querySelector('.nf-bottom-tab[data-nftab="input"]')?.classList.add('active');
    document.querySelectorAll('.nf-tab-panel').forEach(tp => tp.classList.add('hidden'));
    document.getElementById('nfTabInput')?.classList.remove('hidden');

    // Reset output panel
    const outEl = document.getElementById('nfOutputContent');
    if (outEl) outEl.innerHTML = `<div class="output-placeholder"><i class="icon-terminal" style="font-size:24px;opacity:0.3"></i><p>Run your code to see output</p></div>`;

    // Init Monaco editor
    this._initAiEditor(p);

    // Init floating panels (drag + resize)
    this._initAilabPanels();

    // Start timer
    this._startAilabTimer();
  },

  _initAilabPanels() {
    const left = document.getElementById('ailabSolveLeft');
    const bottom = document.getElementById('ailabBottomPanel');
    if (left && !left._ailabDragInit) {
      left._ailabDragInit = true;
      this._makeDraggable(left, left.querySelector('.solve-topbar'));
      this._attachResizeEdges(left);
    }
    if (bottom && !bottom._ailabDragInit) {
      bottom._ailabDragInit = true;
      this._makeDraggable(bottom, bottom.querySelector('.bottom-panel-header'));
      this._attachResizeEdges(bottom);
    }
  },

  _ailabTimer: null,
  _ailabTimerSec: 0,

  _startAilabTimer() {
    clearInterval(this._ailabTimer);
    this._ailabTimerSec = 0;
    const el = document.getElementById('ailabTimerDisplay');
    if (el) el.textContent = '00:00';
    this._ailabTimer = setInterval(() => {
      this._ailabTimerSec++;
      const m = Math.floor(this._ailabTimerSec / 60).toString().padStart(2, '0');
      const s = (this._ailabTimerSec % 60).toString().padStart(2, '0');
      const el2 = document.getElementById('ailabTimerDisplay');
      if (el2) el2.textContent = `${m}:${s}`;
    }, 1000);
  },

  _closeAilabSolve() {
    clearInterval(this._ailabTimer);
    const overlay = document.getElementById('ailabSolveOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (this._ailabEditor) { this._ailabEditor.dispose(); this._ailabEditor = null; }
    // Reset drag-init flags so panels re-init on next open
    const left = document.getElementById('ailabSolveLeft');
    const bottom = document.getElementById('ailabBottomPanel');
    if (left) { left._ailabDragInit = false; left.style.left = ''; left.style.top = ''; left.style.width = ''; left.style.height = ''; }
    if (bottom) { bottom._ailabDragInit = false; bottom.style.left = ''; bottom.style.top = ''; bottom.style.right = ''; bottom.style.bottom = ''; bottom.style.width = ''; bottom.style.height = ''; }
    location.hash = '#/ailab';
  },

  _toggleAilabProblemPanel() {
    const panel = document.getElementById('ailabSolveLeft');
    if (panel) panel.classList.toggle('float-hidden');
  },

  _toggleAilabBottomPanel() {
    const panel = document.getElementById('ailabBottomPanel');
    if (panel) panel.classList.toggle('float-hidden');
  },

  _initAiEditor(problem) {
    const container = document.getElementById('ailabMonacoEditor');
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
      container.innerHTML = `<textarea id="ailabCodeFallback" class="nf-io-textarea" style="height:100%;font-family:monospace;font-size:14px">${this._esc(code)}</textarea>`;
    }
  },

  _getAiCode() {
    if (this._ailabEditor) return this._ailabEditor.getValue();
    const fb = document.getElementById('ailabCodeFallback');
    return fb ? fb.value : '';
  },

  _resetAiCode() {
    if (!this._ailabProblem) return;
    const code = (this._ailabProblem.starter_code || '').replace(/\\n/g, '\n');
    if (this._ailabEditor) this._ailabEditor.setValue(code);
    else { const fb = document.getElementById('ailabCodeFallback'); if (fb) fb.value = code; }
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
      this._closeAilabSolve();
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
  /* ========== WORKSHOP ========== */
  _wpView: 'cards', // cards | table
  _wpFilter: 'all', // all | easy | medium | hard | extreme
  _wpSearch: '',

  async renderWorkshop(el) {
    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-code" style="font-size:28px"></i> <span class="glitch" data-text="Workshop">Workshop</span></h1>
        <p>// design problems · host contests · run quizzes · sharpen blades.</p>
      </div>
      <div class="workshop-tabs">
        <button class="workshop-mode-tab active" data-mode="problems" onclick="App._switchWorkshopMode('problems',this)">▸ Problems</button>
        <button class="workshop-mode-tab" data-mode="contests" onclick="App._switchWorkshopMode('contests',this)">⊛ Contests</button>
        <button class="workshop-mode-tab" data-mode="join" onclick="App._switchWorkshopMode('join',this)">⊕ Join Contest</button>
      </div>
      <div id="workshopModeContent"></div>`;
    this._switchWorkshopMode('problems', el.querySelector('[data-mode="problems"]'));
  },

  _switchWorkshopMode(mode, btn) {
    document.querySelectorAll('.workshop-mode-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const el = document.getElementById('workshopModeContent');
    if (!el) return;
    if (mode === 'problems') this._renderWorkshopProblemsMode(el);
    else if (mode === 'contests') this._renderWorkshopContestsMode(el);
    else if (mode === 'join') this._renderWorkshopJoinMode(el);
  },

  _renderWorkshopProblemsMode(el) {
    el.innerHTML = `
      <div id="workshopStatsBar" class="workshop-stats-bar">
        <div class="workshop-stat-card"><div class="workshop-stat-val" id="wsStat1">—</div><div class="workshop-stat-lbl">authored</div></div>
        <div class="workshop-stat-card"><div class="workshop-stat-val" id="wsStat2">—</div><div class="workshop-stat-lbl">samples</div></div>
        <div class="workshop-stat-card"><div class="workshop-stat-val" id="wsStat3">—</div><div class="workshop-stat-lbl">avg rating</div></div>
        <div class="workshop-stat-card"><div class="workshop-stat-val" id="wsStat4">—</div><div class="workshop-stat-lbl">latest</div></div>
      </div>
      <div class="workshop-toolbar">
        <div class="input-icon-wrap" style="flex:1;min-width:180px">
          <i class="icon-search"></i>
          <input class="input full-width" id="wpSearchInput" placeholder="Search problems..." oninput="App._wpSearchFilter(this.value)">
        </div>
        <button class="workshop-filter-btn ${this._wpFilter==='all'?'active':''}" onclick="App._wpSetFilter('all',this)">all</button>
        <button class="workshop-filter-btn ${this._wpFilter==='easy'?'active':''}" onclick="App._wpSetFilter('easy',this)">easy</button>
        <button class="workshop-filter-btn ${this._wpFilter==='medium'?'active':''}" onclick="App._wpSetFilter('medium',this)">medium</button>
        <button class="workshop-filter-btn ${this._wpFilter==='hard'?'active':''}" onclick="App._wpSetFilter('hard',this)">hard</button>
        <button class="workshop-filter-btn ${this._wpFilter==='extreme'?'active':''}" onclick="App._wpSetFilter('extreme',this)">extreme</button>
        <div class="wp-view-toggle">
          <button class="wp-view-btn ${this._wpView==='cards'?'active':''}" onclick="App._wpSetView('cards',this)" title="Card view"><i class="icon-grid"></i></button>
          <button class="wp-view-btn ${this._wpView==='table'?'active':''}" onclick="App._wpSetView('table',this)" title="Table view"><i class="icon-list"></i></button>
        </div>
        <button class="btn btn-primary" onclick="App.showCreateProblem()"><i class="icon-plus" style="font-size:14px"></i> new problem</button>
      </div>
      <div id="workshopCreateForm" class="hidden"></div>
      <div id="workshopList"></div>`;
    this._loadWorkshopList();
  },

  async _renderWorkshopContestsMode(el) {
    el.innerHTML = `<div style="padding:20px 0;color:var(--text-muted);font-family:var(--mono);font-size:12px">// loading contests...</div>`;
    const myContests = this._username ? await API.getMyContests(this._username) : { ok: false, contests: [] };
    const contests = myContests.ok ? myContests.contests : [];

    // Load user's custom problems for picker
    const probData = await API.getCustomProblems();
    const myProbs = (probData.ok ? probData.problems : []).filter(p => !this._username || p.creator === this._username);

    const genId = () => {
      const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      return 'NX-' + Array.from({length:6}, () => c[Math.floor(Math.random()*c.length)]).join('');
    };

    el.innerHTML = `
      <div class="contests-toolbar">
        <button class="btn btn-primary" onclick="App._showContestForm()"><i class="icon-plus" style="font-size:13px"></i> create contest</button>
        <span style="font-family:var(--mono);font-size:12px;color:var(--text-muted)">${contests.length} contest${contests.length !== 1 ? 's' : ''} hosted</span>
      </div>
      <div id="contestCreateForm" class="hidden"></div>
      <div class="contests-grid" id="contestsList">
        ${contests.length ? contests.map(c => {
          const now = Date.now();
          const start = new Date(c.start_time).getTime();
          const end = start + c.duration_mins * 60000;
          const status = now < start ? 'upcoming' : now < end ? 'live' : 'ended';
          const typeIcon = c.type === 'speed' ? '⚡' : c.type === 'accuracy' ? '✔' : '◆';
          const probs = JSON.parse(c.problems || '[]');
          return `<div class="contest-card type-${c.type}" onclick="App._viewContest(${c.id})">
            <div class="contest-icon">${typeIcon}</div>
            <div class="contest-info">
              <div class="contest-title">${this._esc(c.title)}</div>
              <div class="contest-meta-row">
                <div class="contest-meta-item">⊞ <span>${c.contest_code}</span></div>
                <div class="contest-meta-item">◌ <span>${c.duration_mins}min</span></div>
                <div class="contest-meta-item">▸ <span>${probs.length} problems</span></div>
                ${c.org_tag ? `<div class="contest-meta-item">⬡ <span>${this._esc(c.org_tag)}</span></div>` : ''}
                ${c.participant_count > 0 ? `<div class="contest-meta-item">⚯ <span>${c.participant_count} joined</span></div>` : ''}
              </div>
            </div>
            <div class="contest-badges">
              <span class="contest-type-badge">${c.type}</span>
              <span class="contest-status-badge ${status}">${status}</span>
            </div>
          </div>`;
        }).join('') : `<div style="padding:30px;text-align:center;color:var(--text-muted);font-family:var(--mono);font-size:12px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg)">
          // no contests yet — create one above
        </div>`}
      </div>`;

    this._workshopContestProbs = myProbs;
  },

  _showContestForm() {
    const el = document.getElementById('contestCreateForm');
    if (!el) return;
    el.classList.remove('hidden');
    const genId = () => {
      const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      return 'NX-' + Array.from({length:6}, () => c[Math.floor(Math.random()*c.length)]).join('');
    };
    let currentCode = genId();
    const probs = this._workshopContestProbs || [];

    el.innerHTML = `
      <div class="contest-form-panel">
        <div class="contest-form-title">create contest</div>
        <div class="contest-form-grid">
          <div class="contest-form-group full">
            <label class="contest-form-label">contest title</label>
            <input id="cfTitle" class="contest-form-input" placeholder="e.g. VITC Coding Round 1" />
          </div>
          <div class="contest-form-group full">
            <label class="contest-form-label">description</label>
            <input id="cfDesc" class="contest-form-input" placeholder="Brief description..." />
          </div>
          <div class="contest-form-group">
            <label class="contest-form-label">type</label>
            <select id="cfType" class="contest-form-select">
              <option value="speed">⚡ Speed Race (first to solve)</option>
              <option value="accuracy">✔ Accuracy (most solved)</option>
              <option value="quiz">◆ Quiz (MCQ style)</option>
            </select>
          </div>
          <div class="contest-form-group">
            <label class="contest-form-label">university / org tag</label>
            <input id="cfOrg" class="contest-form-input" placeholder="e.g. VIT Chennai" />
          </div>
          <div class="contest-form-group">
            <label class="contest-form-label">contest id (auto-generated)</label>
            <div class="contest-id-display">
              <span id="cfCodeDisplay">${currentCode}</span>
              <button class="contest-id-regen" onclick="(function(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';document.getElementById('cfCodeDisplay').textContent='NX-'+Array.from({length:6},()=>c[Math.floor(Math.random()*c.length)]).join('')})()">↺ regenerate</button>
            </div>
          </div>
          <div class="contest-form-group">
            <label class="contest-form-label">password (for participants)</label>
            <input id="cfPass" class="contest-form-input" type="password" placeholder="Min 4 characters" autocomplete="new-password" />
          </div>
          <div class="contest-form-group">
            <label class="contest-form-label">start time</label>
            <input id="cfStart" class="contest-form-input" type="datetime-local" />
          </div>
          <div class="contest-form-group">
            <label class="contest-form-label">duration</label>
            <select id="cfDuration" class="contest-form-select">
              <option value="30">30 minutes</option>
              <option value="60" selected>1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
              <option value="240">4 hours</option>
            </select>
          </div>
          <div class="contest-form-group">
            <label class="contest-form-label">max participants</label>
            <input id="cfMax" class="contest-form-input" type="number" value="50" min="2" max="500" />
          </div>
          <div class="contest-form-group full">
            <label class="contest-form-label">select problems (from your workshop)</label>
            <div class="contest-prob-list" id="cfProbList">
              ${probs.length ? probs.map(p => `
                <label class="contest-prob-pick-item">
                  <input type="checkbox" value="${p.id}" style="accent-color:var(--brand)"> 
                  ${this._esc(p.title)} <span style="color:var(--text-muted);margin-left:6px">${p.difficulty || ''}</span>
                </label>`).join('') : '<div style="color:var(--text-muted);font-family:var(--mono);font-size:11px;padding:8px">// no custom problems yet — create some in the Problems tab first</div>'}
            </div>
          </div>
        </div>
        <div class="contest-form-footer">
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('contestCreateForm').classList.add('hidden')">cancel</button>
          <button class="btn btn-primary btn-sm" onclick="App._saveContest()">⊛ create contest</button>
        </div>
      </div>`;
  },

  async _saveContest() {
    const title = document.getElementById('cfTitle')?.value?.trim();
    const desc = document.getElementById('cfDesc')?.value?.trim() || '';
    const type = document.getElementById('cfType')?.value;
    const org = document.getElementById('cfOrg')?.value?.trim() || '';
    const code = document.getElementById('cfCodeDisplay')?.textContent?.trim();
    const password = document.getElementById('cfPass')?.value;
    const startTime = document.getElementById('cfStart')?.value;
    const duration = parseInt(document.getElementById('cfDuration')?.value || '60');
    const maxP = parseInt(document.getElementById('cfMax')?.value || '50');
    const selectedProbs = [...document.querySelectorAll('#cfProbList input[type="checkbox"]:checked')].map(c => parseInt(c.value));

    if (!title) { this.toast('Contest title required', 'error'); return; }
    if (!password || password.length < 4) { this.toast('Password must be at least 4 characters', 'error'); return; }
    if (!startTime) { this.toast('Start time required', 'error'); return; }

    const data = await API.createContest({
      creator: this._username,
      title, description: desc, type, password, org_tag: org,
      start_time: new Date(startTime).toISOString(),
      duration_mins: duration, problems: selectedProbs, max_participants: maxP
    });

    if (data.ok) {
      this.toast(`Contest created! ID: ${data.contest_code}`, 'success');
      document.getElementById('contestCreateForm')?.classList.add('hidden');
      // Refresh
      const btn = document.querySelector('[data-mode="contests"]');
      this._switchWorkshopMode('contests', btn);
    } else {
      this.toast(data.error || 'Failed to create contest', 'error');
    }
  },

  async _viewContest(id) {
    const overlay = document.getElementById('contestDetailOverlay');
    if (!overlay) {
      document.body.insertAdjacentHTML('beforeend', `<div id="contestDetailOverlay" class="contest-detail-overlay hidden"></div>`);
    }
    const ov = document.getElementById('contestDetailOverlay');
    ov.classList.remove('hidden');
    ov.innerHTML = `<div class="contest-detail-box"><div style="color:var(--text-muted);font-family:var(--mono);font-size:12px">// loading...</div></div>`;

    const data = await API.getContestDetails(id, this._username);
    if (!data.ok) {
      ov.innerHTML = `<div class="contest-detail-box">
        <div style="color:var(--danger);font-family:var(--mono)">${data.error || 'Not found'}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:16px" onclick="document.getElementById('contestDetailOverlay').classList.add('hidden')">close</button>
      </div>`;
      return;
    }
    const c = data.contest;
    const probs = JSON.parse(c.problems || '[]');
    const typeIcon = c.type === 'speed' ? '⚡' : c.type === 'accuracy' ? '✔' : '◆';
    const now = Date.now();
    const start = new Date(c.start_time).getTime();
    const end = start + c.duration_mins * 60000;
    const status = now < start ? 'upcoming' : now < end ? 'live' : 'ended';

    ov.innerHTML = `<div class="contest-detail-box">
      <div class="contest-detail-header">
        <div class="contest-detail-type-icon type-${c.type}" style="background:var(--brand-bg)">${typeIcon}</div>
        <div>
          <div class="contest-detail-title">${this._esc(c.title)}</div>
          <span class="contest-status-badge ${status}" style="margin-top:4px;display:inline-block">${status}</span>
        </div>
        <button class="squad-action-btn" style="margin-left:auto" onclick="document.getElementById('contestDetailOverlay').classList.add('hidden')">✕</button>
      </div>
      <div class="contest-detail-id-row">
        <span class="contest-detail-id-label">CONTEST ID:</span>
        <span class="contest-detail-id" id="cdContestId">${c.contest_code}</span>
        <button class="contest-detail-copy" onclick="navigator.clipboard.writeText('${c.contest_code}');App.toast('ID copied!','success')" title="Copy ID">⊕ copy</button>
      </div>
      ${c.description ? `<div style="color:var(--text-secondary);font-size:12px;margin-bottom:12px">${this._esc(c.description)}</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        <div style="background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px">
          <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted);margin-bottom:3px">TYPE</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--brand-light)">${c.type.toUpperCase()}</div>
        </div>
        <div style="background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px">
          <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted);margin-bottom:3px">DURATION</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--text-bright)">${c.duration_mins} min</div>
        </div>
        <div style="background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px">
          <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted);margin-bottom:3px">START</div>
          <div style="font-family:var(--mono);font-size:12px;color:var(--text-bright)">${new Date(c.start_time).toLocaleString()}</div>
        </div>
        <div style="background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px">
          <div style="font-family:var(--mono);font-size:10px;color:var(--text-muted);margin-bottom:3px">PARTICIPANTS</div>
          <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--text-bright)">${data.participants.length} / ${c.max_participants}</div>
        </div>
      </div>
      ${c.org_tag ? `<div style="margin-bottom:12px;font-family:var(--mono);font-size:12px;color:var(--text-secondary)">⬡ ${this._esc(c.org_tag)}</div>` : ''}
      ${probs.length ? `<div style="font-family:var(--mono);font-size:11px;color:var(--text-muted);margin-bottom:8px;letter-spacing:1px">PROBLEMS (${probs.length})</div>
      <div class="contest-detail-prob-list">${probs.map((pid, i) => `<div class="contest-detail-prob-item"><span class="contest-detail-prob-idx">${String.fromCharCode(65+i)}.</span> Problem #${pid}</div>`).join('')}</div>` : ''}
      ${data.participants.length > 0 ? `<div style="font-family:var(--mono);font-size:11px;color:var(--text-muted);margin:16px 0 8px;letter-spacing:1px">PARTICIPANTS</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${data.participants.slice(0,12).map(p => `<span style="padding:3px 10px;background:var(--bg-3);border:1px solid var(--border);border-radius:12px;font-family:var(--mono);font-size:11px;color:var(--text-secondary)">@${this._esc(p.username)}</span>`).join('')}</div>` : ''}
      <div class="contest-detail-actions">
        ${data.isOwner ? `<button class="btn btn-ghost btn-sm" onclick="App._deleteContest(${c.id})" style="color:var(--danger)">delete</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('contestDetailOverlay').classList.add('hidden')">close</button>
      </div>
    </div>`;
  },

  async _deleteContest(id) {
    if (!confirm('Delete this contest? This cannot be undone.')) return;
    const data = await API.deleteContest(id, this._username);
    if (data.ok) {
      this.toast('Contest deleted', 'success');
      document.getElementById('contestDetailOverlay')?.classList.add('hidden');
      const btn = document.querySelector('[data-mode="contests"]');
      this._switchWorkshopMode('contests', btn);
    } else {
      this.toast(data.error || 'Failed to delete', 'error');
    }
  },

  _renderWorkshopJoinMode(el) {
    el.innerHTML = `
      <div class="join-contest-panel">
        <div class="contest-form-title">join a contest</div>
        <p style="font-family:var(--mono);font-size:12px;color:var(--text-muted);margin-bottom:16px">// enter the contest ID and password shared by your professor or organizer</p>
        <div class="join-contest-fields">
          <div class="contest-form-group">
            <label class="contest-form-label">contest id</label>
            <input id="joinContestCode" class="contest-join-code-input" placeholder="NX-XXXXXX" maxlength="9" oninput="this.value=this.value.toUpperCase()" />
          </div>
          <div class="contest-form-group">
            <label class="contest-form-label">password</label>
            <input id="joinContestPass" class="contest-form-input" type="password" placeholder="Enter contest password" autocomplete="off" />
          </div>
        </div>
        <button class="btn btn-primary" onclick="App._joinContestById()">⊕ join contest</button>
      </div>
      <div id="joinContestResult" style="margin-top:16px"></div>`;
  },

  async _joinContestById() {
    const code = document.getElementById('joinContestCode')?.value?.trim().toUpperCase();
    const pass = document.getElementById('joinContestPass')?.value;
    const resEl = document.getElementById('joinContestResult');

    if (!code || code.length < 6) { this.toast('Enter a valid contest ID', 'error'); return; }
    if (!pass) { this.toast('Password required', 'error'); return; }

    const data = await API.joinContest(this._username, code, pass);
    if (data.ok) {
      const c = data.contest;
      const start = new Date(c.start_time).getTime();
      const end = start + c.duration_mins * 60000;
      const now = Date.now();
      const status = now < start ? 'upcoming' : now < end ? 'live' : 'ended';
      const typeIcon = c.type === 'speed' ? '⚡' : c.type === 'accuracy' ? '✔' : '◆';

      resEl.innerHTML = `<div class="contest-form-panel" style="border-color:rgba(16,185,129,0.3)">
        <div class="contest-form-title" style="color:var(--success)">✔ enrolled successfully</div>
        <div class="contest-card type-${c.type}" style="margin-top:0;cursor:default" onclick="App._viewContest(${c.id})">
          <div class="contest-icon">${typeIcon}</div>
          <div class="contest-info">
            <div class="contest-title">${this._esc(c.title)}</div>
            <div class="contest-meta-row">
              <div class="contest-meta-item">⊞ <span>${c.contest_code}</span></div>
              <div class="contest-meta-item">◌ <span>${c.duration_mins}min</span></div>
              ${c.org_tag ? `<div class="contest-meta-item">⬡ <span>${this._esc(c.org_tag)}</span></div>` : ''}
            </div>
          </div>
          <div class="contest-badges">
            <span class="contest-type-badge">${c.type}</span>
            <span class="contest-status-badge ${status}">${status}</span>
          </div>
        </div>
        <div style="margin-top:14px;font-family:var(--mono);font-size:12px;color:var(--text-muted)">
          starts: ${new Date(c.start_time).toLocaleString()} · ${c.duration_mins} minutes · ${data.participant_count} participants
        </div>
      </div>`;
      this.toast(`Joined ${c.title}!`, 'success');
    } else {
      resEl.innerHTML = `<div style="padding:14px;background:var(--danger-bg);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);color:var(--danger);font-family:var(--mono);font-size:12px">// ${data.error || 'Failed to join'}</div>`;
      this.toast(data.error || 'Failed to join contest', 'error');
    }
  },

  _wpGetDiffClass(rating) {
    if (rating < 1200) return 'wp-diff-easy';
    if (rating < 1800) return 'wp-diff-medium';
    if (rating < 2400) return 'wp-diff-hard';
    return 'wp-diff-extreme';
  },

  _wpSetView(view, btn) {
    this._wpView = view;
    document.querySelectorAll('.wp-view-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this._renderWorkshopProblems(this._wpAllProblems || []);
  },

  _wpSetFilter(filter, btn) {
    this._wpFilter = filter;
    document.querySelectorAll('.workshop-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this._renderWorkshopProblems(this._wpAllProblems || []);
  },

  _wpSearchFilter(q) {
    this._wpSearch = q.toLowerCase();
    this._renderWorkshopProblems(this._wpAllProblems || []);
  },

  async _loadWorkshopList() {
    const el = document.getElementById('workshopList');
    const data = await API.getCustomProblems();
    if (!data.ok) { el.innerHTML = '<p class="text-muted">Error loading problems</p>'; return; }
    this._wpAllProblems = data.problems || [];

    // Fill stats
    const probs = this._wpAllProblems;
    const s1 = document.getElementById('wsStat1');
    const s2 = document.getElementById('wsStat2');
    const s3 = document.getElementById('wsStat3');
    const s4 = document.getElementById('wsStat4');
    if (s1) s1.textContent = probs.length;
    if (s2) s2.textContent = probs.reduce((a,p) => a + JSON.parse(p.samples||'[]').length, 0);
    if (s3) s3.textContent = probs.length ? Math.round(probs.reduce((a,p) => a + p.difficulty, 0) / probs.length) : 0;
    if (s4) s4.textContent = probs.length ? this._timeAgo(probs[0].created_at) : '—';

    this._renderWorkshopProblems(probs);
  },

  _renderWorkshopProblems(probs) {
    const el = document.getElementById('workshopList');
    if (!el) return;

    // Filter
    let filtered = probs;
    if (this._wpFilter !== 'all') {
      const ranges = { easy: [0,1199], medium: [1200,1799], hard: [1800,2399], extreme: [2400,9999] };
      const [lo, hi] = ranges[this._wpFilter] || [0,9999];
      filtered = filtered.filter(p => p.difficulty >= lo && p.difficulty <= hi);
    }
    if (this._wpSearch) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(this._wpSearch) ||
        (p.tags && p.tags.toLowerCase().includes(this._wpSearch))
      );
    }

    if (!filtered.length) {
      el.innerHTML = `<div class="empty-state">
        <span style="font-size:56px;opacity:0.3"><i class="icon-wrench"></i></span>
        <h3 style="color:var(--text-secondary)">${probs.length ? '// no matches found' : '// workspace empty'}</h3>
        <p style="color:var(--text-muted)">${probs.length ? 'Try a different filter or search term' : 'Click "new problem" to author your first problem'}</p>
      </div>`;
      return;
    }

    if (this._wpView === 'cards') {
      el.innerHTML = `<div class="workshop-cards-grid">${filtered.map(p => {
        const samples = JSON.parse(p.samples||'[]');
        const tags = (() => { try { return JSON.parse(p.tags||'[]'); } catch { return []; } })();
        const diffCls = this._wpGetDiffClass(p.difficulty);
        const descText = p.statement ? p.statement.replace(/<[^>]+>/g,'').substring(0,100) : '// no description';
        return `<div class="wp-card ${diffCls}">
          <div class="wp-card-accent"></div>
          <div class="wp-card-body">
            <div class="wp-card-meta">
              ${this._ratingBadge(p.difficulty)}
              <span class="wp-card-samples-badge"><i class="icon-document" style="font-size:11px"></i> ${samples.length} sample${samples.length!==1?'s':''}</span>
            </div>
            <div class="wp-card-title" onclick="App.openSolveCustom(${p.id})">${this._esc(p.title)}</div>
            <div class="wp-card-desc">${this._esc(descText)}${descText.length===100?'...':''}</div>
            ${tags.length ? `<div class="wp-card-tags">${tags.slice(0,4).map(t=>`<span class="wp-card-tag">${this._esc(t)}</span>`).join('')}</div>` : ''}
          </div>
          <div class="wp-card-footer">
            <span class="wp-card-date"><i class="icon-clock" style="font-size:11px"></i> ${this._timeAgo(p.created_at)}</span>
            <div class="wp-card-actions">
              <button class="btn btn-outline btn-sm" onclick="App.openSolveCustom(${p.id})" title="Solve"><i class="icon-sword"></i></button>
              <button class="btn btn-ghost btn-sm" onclick="App.editCustomProblem(${p.id})" title="Edit"><i class="icon-edit"></i></button>
              <button class="btn btn-ghost btn-sm" onclick="App._wpCopyLink(${p.id},this)" title="Copy link"><i class="icon-copy"></i></button>
              <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="App.deleteCustomProblem(${p.id})" title="Delete"><i class="icon-trash"></i></button>
            </div>
          </div>
        </div>`;
      }).join('')}</div>`;
    } else {
      el.innerHTML = `<div class="card"><table class="problem-table"><thead><tr>
        <th>Title</th><th style="width:100px">Difficulty</th><th style="width:80px">Samples</th><th style="width:140px">Created</th><th style="width:200px">Actions</th>
      </tr></thead><tbody>
        ${filtered.map(p => {
          const samples = JSON.parse(p.samples||'[]');
          return `<tr>
            <td><span class="problem-title-link" onclick="App.openSolveCustom(${p.id})">${this._esc(p.title)}</span></td>
            <td>${this._ratingBadge(p.difficulty)}</td>
            <td class="text-muted">${samples.length}</td>
            <td class="text-sm text-muted">${this._timeAgo(p.created_at)}</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="App.openSolveCustom(${p.id})"><i class="icon-sword"></i> Solve</button>
              <button class="btn btn-ghost btn-sm" onclick="App.editCustomProblem(${p.id})"><i class="icon-edit"></i></button>
              <button class="btn btn-ghost btn-sm" onclick="App._wpCopyLink(${p.id},this)"><i class="icon-copy"></i></button>
              <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="App.deleteCustomProblem(${p.id})"><i class="icon-trash"></i></button>
            </td>
          </tr>`;
        }).join('')}
      </tbody></table></div>`;
    }
  },

  _wpCopyLink(id, btn) {
    const url = `${window.location.origin}${window.location.pathname}#/workshop`;
    navigator.clipboard.writeText(url).catch(()=>{});
    this.toast('Link copied to clipboard!', 'success');
    if (btn) { btn.classList.add('copy-flash'); setTimeout(() => btn.classList.remove('copy-flash'), 400); }
  },

  showCreateProblem(existing) {
    const form = document.getElementById('workshopCreateForm');
    const p = existing || {};
    const samples = existing ? JSON.parse(p.samples || '[]') : [{ input: '', output: '' }];
    const tags = existing ? (() => { try { return JSON.parse(p.tags||'[]'); } catch { return []; } })() : [];
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.innerHTML = `
      <div class="card mb-3">
        <div class="card-header">
          <span class="card-title"><i class="icon-edit" style="font-size:16px"></i> ${existing ? 'edit' : 'new'} problem</span>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('workshopCreateForm').classList.add('hidden')">✕ close</button>
        </div>
        <div class="workshop-form" style="padding:20px">
          <div class="flex gap-3">
            <div style="flex:3">
              <label class="text-sm text-muted">Problem Title *</label>
              <input class="input full-width" id="wpTitle" value="${this._esc(p.title || '')}" placeholder="e.g. Maximum Subarray Sum" style="margin-top:4px">
            </div>
            <div style="flex:1">
              <label class="text-sm text-muted">Difficulty Rating</label>
              <input class="input full-width" id="wpDifficulty" type="number" value="${p.difficulty || 1000}" min="0" max="3500" style="margin-top:4px" oninput="App._wpUpdateDiffPreview(this.value)">
            </div>
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding-top:18px">
              <div id="wpDiffPreview">${this._ratingBadge(p.difficulty || 1000)}</div>
            </div>
          </div>

          <div class="mt-3">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <label class="text-sm text-muted">Problem Statement</label>
              <div style="display:flex;gap:6px">
                <span style="font-size:11px;color:var(--text-muted);align-self:center">Supports HTML</span>
                <button class="btn btn-ghost btn-sm" onclick="App._toggleWpPreview()" id="wpPreviewToggleBtn">👁 Preview</button>
              </div>
            </div>
            <div class="wp-editor-split" id="wpEditorSplit" style="height:300px">
              <div class="wp-editor-pane">
                <div class="wp-editor-pane-header">
                  <span>problem.html</span>
                  <span style="font-size:10px">Ctrl+P preview</span>
                </div>
                <textarea id="wpStatement" oninput="App._wpUpdatePreview()">${this._esc(p.statement || '')}</textarea>
              </div>
              <div class="wp-editor-pane" id="wpPreviewPane" style="display:none">
                <div class="wp-editor-pane-header"><span>preview</span></div>
                <div class="wp-preview-pane" id="wpPreviewContent"></div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-3">
            <div style="flex:1">
              <label class="text-sm text-muted">Input Specification</label>
              <textarea class="input full-width" id="wpInputSpec" rows="3" placeholder="Describe input format..." style="margin-top:4px">${this._esc(p.input_spec || '')}</textarea>
            </div>
            <div style="flex:1">
              <label class="text-sm text-muted">Output Specification</label>
              <textarea class="input full-width" id="wpOutputSpec" rows="3" placeholder="Describe output format..." style="margin-top:4px">${this._esc(p.output_spec || '')}</textarea>
            </div>
          </div>

          <div class="flex gap-3 mt-3">
            <div style="flex:1">
              <label class="text-sm text-muted">Time Limit</label>
              <input class="input full-width" id="wpTimeLimit" value="${p.time_limit || '2 seconds'}" style="margin-top:4px">
            </div>
            <div style="flex:1">
              <label class="text-sm text-muted">Memory Limit</label>
              <input class="input full-width" id="wpMemLimit" value="${p.memory_limit || '256 MB'}" style="margin-top:4px">
            </div>
            <div style="flex:2">
              <label class="text-sm text-muted">Tags (comma-separated)</label>
              <input class="input full-width" id="wpTags" value="${tags.join(', ')}" placeholder="dp, greedy, graphs..." style="margin-top:4px">
            </div>
          </div>

          <div class="mt-3">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <label class="text-sm text-muted">Sample Test Cases</label>
              <button class="btn btn-ghost btn-sm" onclick="App._addWpSample()"><i class="icon-plus" style="font-size:11px"></i> Add Sample</button>
            </div>
            <div class="wp-sample-grid" id="wpSamples">
              ${samples.map((s, i) => this._wpSampleHtml(i, s.input, s.output)).join('')}
            </div>
          </div>

          <div class="flex gap-2 mt-4">
            <button class="btn btn-primary" onclick="App.saveCustomProblem(${existing ? p.id : 'null'})">
              <i class="icon-check" style="font-size:14px"></i> ${existing ? 'Save Changes' : 'Create Problem'}
            </button>
            <button class="btn btn-ghost" onclick="document.getElementById('workshopCreateForm').classList.add('hidden')">Cancel</button>
          </div>
        </div>
      </div>`;
  },

  _wpSampleHtml(idx, inputVal = '', outputVal = '') {
    return `<div class="wp-sample-item" id="wpSample_${idx}">
      <div class="wp-sample-header">
        <span>Sample ${idx + 1}</span>
        <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="App._removeWpSample(${idx})">✕ Remove</button>
      </div>
      <div class="wp-sample-cols">
        <div class="wp-sample-col">
          <label>Input</label>
          <textarea class="wp-sample-in" rows="3" placeholder="Sample input...">${this._esc(inputVal)}</textarea>
        </div>
        <div class="wp-sample-col">
          <label>Expected Output</label>
          <textarea class="wp-sample-out" rows="3" placeholder="Expected output...">${this._esc(outputVal)}</textarea>
        </div>
      </div>
    </div>`;
  },

  _wpUpdateDiffPreview(val) {
    const el = document.getElementById('wpDiffPreview');
    if (el) el.innerHTML = this._ratingBadge(+val || 0);
  },

  _wpUpdatePreview() {
    const stmt = document.getElementById('wpStatement');
    const preview = document.getElementById('wpPreviewContent');
    if (stmt && preview) preview.innerHTML = stmt.value;
  },

  _toggleWpPreview() {
    const pane = document.getElementById('wpPreviewPane');
    const split = document.getElementById('wpEditorSplit');
    const btn = document.getElementById('wpPreviewToggleBtn');
    if (!pane) return;
    const showing = pane.style.display !== 'none';
    pane.style.display = showing ? 'none' : 'flex';
    if (split) split.style.gridTemplateColumns = showing ? '1fr' : '1fr 1fr';
    if (btn) btn.textContent = showing ? '👁 Preview' : '✕ Preview';
    if (!showing) this._wpUpdatePreview();
  },

  _addWpSample() {
    const container = document.getElementById('wpSamples');
    const idx = container.querySelectorAll('.wp-sample-item').length;
    const div = document.createElement('div');
    div.innerHTML = this._wpSampleHtml(idx);
    container.appendChild(div.firstElementChild);
  },

  _removeWpSample(idx) {
    const el = document.getElementById('wpSample_' + idx);
    if (el) el.remove();
    // Renumber remaining samples
    document.querySelectorAll('.wp-sample-item').forEach((el, i) => {
      const header = el.querySelector('.wp-sample-header span');
      if (header) header.textContent = 'Sample ' + (i + 1);
    });
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
        value: this._defaultCode(), language: (this._langs.find(l=>l.id===this._currentLang)||{mono:'cpp'}).mono, theme: 'vs-dark',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 14,
        minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 },
        automaticLayout: true, tabSize: 4, bracketPairColorization: { enabled: true },
        inlineSuggest: { enabled: true, mode: 'subwordSmart' },
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: 'currentDocument',
        suggest: { preview: true, showMethods: true, showFunctions: true, showSnippets: true },
      });
    }

    // Start recording for code replay
    this._startRecording();

    // Init gamified HUD + timer for custom problems
    this._initSolveHUD({ ...p, problem_id: p.title, rating: p.difficulty });
    this._startSolveTimer();
  },
  async openSolve(problemId) {
    const data = await API.getProblem(problemId);
    if (!data.ok) return;
    this.currentProblem = data;
    this.currentStatement = null;
    const p = data.problem;

    // Top bar badges — support all platforms
    const _pMap = { codeforces:'CF', codechef:'CC', atcoder:'AC', leetcode:'LC', spoj:'SP', euler:'PE' };
    const _cMap = { codeforces:'badge-cf', codechef:'badge-cc', atcoder:'badge-ac', leetcode:'badge-lc', spoj:'badge-sp', euler:'badge-pe' };
    const platformBadge = _pMap[p.platform] || p.platform.substring(0,2).toUpperCase();
    const badgeClass = _cMap[p.platform] || 'badge-cc';
    const badges = document.getElementById('solveProblemBadges');
    badges.innerHTML = `
      <span class="badge ${badgeClass}" style="font-size:10px">${platformBadge}</span>
      ${this._ratingBadge(p.rating)}
      <span style="font-weight:600;color:var(--text-bright);font-size:13px">${this._esc(p.problem_id)} \u00b7 ${this._esc(p.title)}</span>`;

    // External link
    document.getElementById('solveExternalLink').href = p.url || '#';

    // Show overlay — reset HUD collapse state
    const overlay = document.getElementById('solveOverlay');
    overlay.classList.remove('hidden');
    overlay.classList.remove('solve-zen');
    const hud = document.getElementById('solveHud');
    if (hud) hud.classList.remove('hud-collapsed');

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
        language: (this._langs.find(l=>l.id===this._currentLang)||{mono:'cpp'}).mono,
        theme: 'vs-dark',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        automaticLayout: true,
        tabSize: 4,
        bracketPairColorization: { enabled: true },
        inlineSuggest: { enabled: true, mode: 'subwordSmart' },
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: 'currentDocument',
        suggest: { preview: true, showMethods: true, showFunctions: true, showSnippets: true },
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
    const _platformNames = { codeforces:'Codeforces', codechef:'CodeChef', atcoder:'AtCoder', leetcode:'LeetCode', spoj:'SPOJ', euler:'Project Euler' };
    const _platformIcons = { codeforces:'bolt', codechef:'star', atcoder:'target', leetcode:'code', spoj:'globe', euler:'brain' };
    metaHtml += `<div class="meta-chip"><i class="icon-${_platformIcons[p.platform] || 'globe'}" style="font-size:13px"></i> ${_platformNames[p.platform] || p.platform}</div>`;
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

    // Typing indicators
    this._socialSocket.on('user-typing', ({ from }) => {
      this._typingUsers[from] = true;
      const indicator = document.getElementById(`chatWinTyping_${from}`);
      if (indicator && this._activeChatUser === from) {
        indicator.innerHTML = `<div class="typing-indicator"><span>${this._esc(from)}</span><div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>`;
      }
      const convPreview = document.getElementById(`convPreview_${from}`);
      if (convPreview) { convPreview.textContent = 'typing...'; convPreview.classList.add('typing-preview'); }
    });

    this._socialSocket.on('user-stopped-typing', ({ from }) => {
      delete this._typingUsers[from];
      const indicator = document.getElementById(`chatWinTyping_${from}`);
      if (indicator) indicator.innerHTML = '';
      const convPreview = document.getElementById(`convPreview_${from}`);
      if (convPreview) { convPreview.classList.remove('typing-preview'); }
    });

    // Messages read receipts
    this._socialSocket.on('messages-read', ({ by }) => {
      // Mark all sent messages as read
      document.querySelectorAll('.chat-read-receipt').forEach(el => {
        el.textContent = '✓✓';
        el.style.color = 'var(--primary)';
      });
    });

    // Voice speaking updates
    this._socialSocket.on('voice-speaking-update', ({ username, speaking }) => {
      const chip = document.querySelector(`.voice-member-chip[data-username="${username}"]`);
      if (chip) chip.classList.toggle('speaking', speaking);
    });

    // Challenge received notification
    this._socialSocket.on('challenge-received', ({ from, problemTitle }) => {
      const notif = document.createElement('div');
      notif.className = 'squad-challenge-notif';
      notif.innerHTML = `
        <h4>⚔ challenge received</h4>
        <p>@${this._esc(from)} challenges you to: ${this._esc(problemTitle || 'a coding duel')}</p>
        <div class="squad-challenge-actions">
          <button class="btn btn-primary btn-sm" onclick="location.hash='#/problems';this.closest('.squad-challenge-notif').remove()">accept</button>
          <button class="btn btn-ghost btn-sm" onclick="this.closest('.squad-challenge-notif').remove()">✕</button>
        </div>`;
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 8000);
    });

    // New message — update both sidebar and inline chat
    this._socialSocket.on('new-message', ({ message }) => {
      // If inline chat is open for this sender, append message
      if (this._activeChatUser === message.from_user) {
        const container = document.getElementById(`chatWinMessages_${message.from_user}`);
        if (container) {
          this._appendInlineChatMessage(message, message.from_user);
          // Clear typing
          const indicator = document.getElementById(`chatWinTyping_${message.from_user}`);
          if (indicator) indicator.innerHTML = '';
          return;
        }
      }
      // Otherwise update unread badge in conv list
      const convItem = document.querySelector(`.chat-conv-item[data-username="${message.from_user}"]`);
      if (convItem) {
        let badge = convItem.querySelector('.chat-conv-unread');
        const count = ((this._chatUnreads[message.from_user] || 0) + 1);
        this._chatUnreads[message.from_user] = count;
        if (!badge) {
          const meta = convItem.querySelector('.chat-conv-meta');
          if (meta) { badge = document.createElement('div'); badge.className = 'chat-conv-unread'; meta.appendChild(badge); }
        }
        if (badge) badge.textContent = count;
        const preview = document.getElementById(`convPreview_${message.from_user}`);
        if (preview) { preview.textContent = message.content?.substring(0, 30) || '...'; preview.classList.remove('typing-preview'); }
      }
      this._checkUnreadMessages();
    });

  }, // end _connectSocialSocket

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

  /* ═══ Gate Screen — Login or Create Profile ═══ */
  showGateScreen() {
    const gate = document.getElementById('gateScreen');
    if (!gate) return;
    gate.classList.remove('hidden');
    const input = document.getElementById('gateUsername');
    const pwInput = document.getElementById('gatePassword');
    const loginOnEnter = e => { if (e.key === 'Enter') this._gateLogin(); };
    if (input) input.addEventListener('keydown', loginOnEnter);
    if (pwInput) pwInput.addEventListener('keydown', loginOnEnter);
  },

  async _gateLogin() {
    const input = document.getElementById('gateUsername');
    const pwInput = document.getElementById('gatePassword');
    const feedback = document.getElementById('gateLoginFeedback');
    const btn = document.getElementById('gateLoginBtn');
    const username = (input?.value || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
    const password = pwInput?.value || '';
    if (!username || username.length < 2) {
      if (feedback) { feedback.textContent = '// username must be at least 2 characters'; feedback.style.color = '#ef4444'; }
      input?.focus();
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="icon-clock"></i> VERIFYING...';
    try {
      const res = await API.loginUser({ username, password });
      if (res.ok && res.user) {
        localStorage.setItem('cp_arena_username', username);
        this._username = username;
        if (feedback) { feedback.textContent = '// access granted'; feedback.style.color = '#22c55e'; }
        btn.innerHTML = '<i class="icon-chevron-right"></i> ACCESS GRANTED';
        setTimeout(() => {
          document.getElementById('gateScreen')?.classList.add('hidden');
          this._updateSidebarPlayer();
          if (!location.hash || location.hash === '#/') location.hash = '#/hub';
          else this.route();
          this._connectSocialSocket();
          this._checkUnreadMessages();
          this.toast(`Welcome back, ${res.user.display_name || username}!`, 'success');
          if (res.user.role === 'admin') this._isAdmin = true;
          this._autoSync();
          window.monacoReady?.then(() => this._registerAutocomplete());
        }, 600);
      } else {
        if (feedback) { feedback.textContent = `// ${res.error || 'login failed'}`; feedback.style.color = '#ef4444'; }
        btn.disabled = false;
        btn.innerHTML = '<i class="icon-chevron-right"></i> ENTER NEXUS';
      }
    } catch (e) {
      if (feedback) { feedback.textContent = '// connection error — try again'; feedback.style.color = '#ef4444'; }
      btn.disabled = false;
      btn.innerHTML = '<i class="icon-chevron-right"></i> ENTER NEXUS';
    }
  },

  _gateCreate() {
    document.getElementById('gateScreen')?.classList.add('hidden');
    this.showUserSetup();
  },

  showUserSetup() {
    const modal = document.getElementById('userSetupModal');
    const picker = document.getElementById('avatarPicker');
    const avatars = ['coder','fox','cat','wolf','sword','shield','trophy','diamond','fire','bolt','star','target','crown','robot','gamepad','brain','tree','globe','moon','dragon'];
    const avatarIconMap = {coder:'icon-avatar-coder',fox:'icon-avatar-fox',cat:'icon-avatar-cat',wolf:'icon-avatar-wolf',sword:'icon-sword',shield:'icon-shield',trophy:'icon-trophy',diamond:'icon-diamond',fire:'icon-fire',bolt:'icon-bolt',star:'icon-star',target:'icon-target',crown:'icon-crown',robot:'icon-robot',gamepad:'icon-gamepad',brain:'icon-brain',tree:'icon-tree',globe:'icon-globe',moon:'icon-moon',dragon:'icon-dragon'};
    this._avatarIconMap = avatarIconMap;
    picker.innerHTML = avatars.map((a, i) =>
      `<button class="avatar-option${i===0?' selected':''}" data-avatar="${a}" onclick="App._pickAvatar(this)"><i class="${avatarIconMap[a]}"></i></button>`
    ).join('');
    modal.classList.remove('hidden');
    this._obCurrentStep = 1;
    this._initOnboardingCanvas();
    this._initCodeRain();
    this._initBootSequence();
    this._setupUsernameChecker();
    this._setupLivePreview();
    this._obXp = 0;
  },

  _obCurrentStep: 1,

  _obGoStep(step) {
    // Validate before advancing
    if (step === 2 && this._obCurrentStep === 1) {
      const u = document.getElementById('setupUsername').value.trim();
      if (!u || u.length < 2) {
        this.toast('Set a callsign first (min 2 chars)', 'error');
        document.getElementById('setupUsername').focus();
        return;
      }
    }
    this._obCurrentStep = step;
    // Update step indicator
    document.querySelectorAll('#obSteps .ob-step').forEach(s => {
      const sNum = parseInt(s.dataset.step);
      s.classList.remove('active', 'done');
      if (sNum === step) s.classList.add('active');
      else if (sNum < step) s.classList.add('done');
    });
    // Show correct panel
    document.querySelectorAll('.ob-step-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('obPanel' + step);
    if (panel) panel.classList.add('active');
    // Scroll to top
    const scroll = document.getElementById('obFormScroll');
    if (scroll) scroll.scrollTop = 0;
    // XP reward for progressing
    if (step > 1) this._obAddXp(5);
  },

  _usernameCheckTimer: null,

  /* Code rain effect */
  _initCodeRain() {
    const container = document.getElementById('obCodeRain');
    if (!container) return;
    const snippets = [
      'const x = 42;','import {solve} from "nexora";','while(true) learn();','fn main() { }',
      'git push origin main','npm run deploy','class Node {}','return dp[n];',
      'for(i=0;i<n;i++)','if(valid(x)) push(x);','// TODO: optimize','await fetch(api);',
      'export default App;','let ans = Infinity;','break;continue;','map.set(k,v);',
    ];
    for (let i = 0; i < 14; i++) {
      const col = document.createElement('div');
      col.className = 'ob-rain-col';
      col.textContent = Array.from({length: 12}, () => snippets[Math.floor(Math.random() * snippets.length)]).join(' ');
      col.style.left = (i * 7.5 + Math.random() * 3) + '%';
      col.style.animationDuration = (12 + Math.random() * 10) + 's';
      col.style.animationDelay = (-Math.random() * 15) + 's';
      col.style.opacity = (0.3 + Math.random() * 0.7).toString();
      container.appendChild(col);
    }
  },

  /* Boot sequence animation */
  _initBootSequence() {
    const boot = document.getElementById('obBoot');
    const mainUI = document.getElementById('obMainUI');
    const textEl = document.getElementById('obBootText');
    const barEl = document.getElementById('obBootBar');
    if (!boot || !mainUI || !textEl || !barEl) {
      // If boot elements missing, skip straight to main
      if (mainUI) mainUI.classList.remove('hidden');
      return;
    }
    boot.classList.remove('hidden');
    mainUI.classList.add('hidden');

    const lines = [
      { text: '> nexora init --create-profile', cls: '', delay: 200 },
      { text: '[OK] Nexora v3.0 kernel loaded', cls: 'ob-bl-ok', delay: 400 },
      { text: '[INFO] Scanning neural pathways...', cls: 'ob-bl-info', delay: 600 },
      { text: '[OK] Identity Forge module ready', cls: 'ob-bl-ok', delay: 800 },
      { text: '[INFO] Connecting to the nexus...', cls: 'ob-bl-info', delay: 500 },
      { text: '[OK] Secure channel established', cls: 'ob-bl-ok', delay: 400 },
      { text: '[WARN] No profile detected — creating new identity', cls: 'ob-bl-warn', delay: 600 },
      { text: '[OK] Launching Identity Forge...', cls: 'ob-bl-ok', delay: 500 },
    ];

    let i = 0;
    const progress = [10, 25, 40, 55, 70, 82, 92, 100];

    const showLine = () => {
      if (i >= lines.length) {
        // Boot complete — transition to main UI
        setTimeout(() => {
          boot.style.transition = 'opacity 0.6s ease';
          boot.style.opacity = '0';
          setTimeout(() => {
            boot.classList.add('hidden');
            boot.style.opacity = '';
            mainUI.classList.remove('hidden');
            mainUI.style.animation = 'obFadeIn 0.5s ease both';
          }, 600);
        }, 400);
        return;
      }
      const line = lines[i];
      const div = document.createElement('div');
      div.className = 'ob-bl ' + line.cls;
      div.textContent = line.text;
      textEl.appendChild(div);
      barEl.style.width = progress[i] + '%';
      i++;
      setTimeout(showLine, line.delay);
    };

    setTimeout(showLine, 800);
  },

  _setupUsernameChecker() {
    const input = document.getElementById('setupUsername');
    if (!input || input._checkerAttached) return;
    input._checkerAttached = true;
    input.addEventListener('input', () => {
      clearTimeout(this._usernameCheckTimer);
      const val = input.value.trim();
      const status = document.getElementById('obUsernameStatus');
      const feedback = document.getElementById('obUsernameFeedback');
      if (!val || val.length < 2) {
        if (status) { status.className = 'ob-username-status'; status.textContent = ''; }
        if (feedback) { feedback.className = 'ob-hint'; feedback.textContent = '// 2-20 chars • letters, numbers, underscores'; }
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(val)) {
        if (status) { status.className = 'ob-username-status taken'; status.textContent = '✗'; }
        if (feedback) { feedback.className = 'ob-hint taken'; feedback.textContent = '// only letters, numbers, underscores'; }
        return;
      }
      if (status) { status.className = 'ob-username-status checking'; status.textContent = '⟳'; }
      if (feedback) { feedback.className = 'ob-hint checking'; feedback.textContent = '// checking availability...'; }
      this._usernameCheckTimer = setTimeout(async () => {
        try {
          const res = await API.checkUsername(val);
          if (res.ok && res.available) {
            if (status) { status.className = 'ob-username-status available'; status.textContent = '✓'; }
            if (feedback) { feedback.className = 'ob-hint available'; feedback.textContent = '// handle available — locked & loaded'; }
            this._obAddXp(10);
          } else {
            if (status) { status.className = 'ob-username-status taken'; status.textContent = '✗'; }
            if (feedback) { feedback.className = 'ob-hint taken'; feedback.textContent = `// ${res.reason || 'username taken'}`; }
          }
        } catch {
          if (status) { status.className = 'ob-username-status'; status.textContent = ''; }
          if (feedback) { feedback.className = 'ob-hint'; feedback.textContent = ''; }
        }
      }, 400);
    });
  },

  _setupLivePreview() {
    const nameInput = document.getElementById('setupDisplayName');
    const handleInput = document.getElementById('setupUsername');
    const bioInput = document.getElementById('setupBio');
    const updatePreview = () => {
      const n = document.getElementById('obLiveName');
      const h = document.getElementById('obLiveHandle');
      const b = document.getElementById('obLiveBio');
      if (n) n.textContent = nameInput?.value?.trim() || 'Player';
      if (h) h.textContent = '@' + (handleInput?.value?.trim() || 'handle');
      if (b) b.textContent = bioInput?.value?.trim() || '// awaiting input...';
    };
    if (nameInput) nameInput.addEventListener('input', updatePreview);
    if (handleInput) handleInput.addEventListener('input', updatePreview);
    if (bioInput) bioInput.addEventListener('input', updatePreview);
  },

  _obXp: 0,
  _obAddXp(amount) {
    this._obXp += amount;
    const el = document.getElementById('obXpVal');
    if (el) {
      el.textContent = this._obXp;
      el.parentElement.style.transform = 'scale(1.15)';
      setTimeout(() => { el.parentElement.style.transform = ''; }, 300);
    }
  },

  /* OAuth handlers */
  _authGitHub() {
    window.location.href = '/auth/github';
  },
  _authGoogle() {
    window.location.href = '/auth/google';
  },

  _handleOAuthComplete() {
    if (!this._oauthUser) return;
    const u = this._oauthUser;
    const usernameInput = document.getElementById('setupUsername');
    const displayInput = document.getElementById('setupDisplayName');
    const emailInput = document.getElementById('setupEmail');
    if (usernameInput && u.username) usernameInput.value = u.username;
    if (displayInput && u.displayName) displayInput.value = u.displayName;
    if (emailInput && u.email) emailInput.value = u.email;
    const tag = document.getElementById('obConnectedTag');
    const text = document.getElementById('obConnectedText');
    if (tag) {
      tag.classList.remove('hidden');
      if (text) text.textContent = `Connected via ${u.provider === 'github' ? 'GitHub' : 'Google'}`;
    }
    const btnId = u.provider === 'github' ? 'obGithubBtn' : 'obGoogleBtn';
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('connected');
    if (u.avatarUrl) {
      this._oauthAvatarUrl = u.avatarUrl;
      const liveAvatar = document.getElementById('obLiveAvatar');
      if (liveAvatar) liveAvatar.innerHTML = `<img src="${this._esc(u.avatarUrl)}" alt="avatar" />`;
    }
    if (usernameInput) usernameInput.dispatchEvent(new Event('input'));
    this._obAddXp(15);
    this.toast(`Authenticated via ${u.provider === 'github' ? 'GitHub' : 'Google'}`, 'success');
  },

  _pickAvatar(btn) {
    document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const avatar = btn.dataset.avatar;
    const cls = this._avatarIconMap[avatar];
    const liveAvatar = document.getElementById('obLiveAvatar');
    if (liveAvatar && !this._oauthAvatarUrl) {
      liveAvatar.innerHTML = cls ? `<i class="${cls}"></i>` : `<i class="icon-avatar-coder"></i>`;
    }
    this._obAddXp(5);
  },

  _initOnboardingCanvas() {
    const canvas = document.getElementById('onboardingCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.3,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.1,
        hue: Math.random() > 0.5 ? 220 : 270,
      });
    }
    const animate = () => {
      if (document.getElementById('userSetupModal')?.classList.contains('hidden')) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},70%,65%,${p.alpha})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(96,165,250,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };
    animate();
  },

  async completeSetup() {
    const username = document.getElementById('setupUsername').value.trim();
    const displayName = document.getElementById('setupDisplayName').value.trim();
    const avatar = document.querySelector('.avatar-option.selected')?.dataset.avatar || 'coder';
    const bio = document.getElementById('setupBio')?.value?.trim() || '';
    const email = document.getElementById('setupEmail')?.value?.trim() || '';
    const errEl = document.getElementById('setupError');
    const submitBtn = document.getElementById('setupSubmitBtn');

    if (!username || username.length < 2) {
      if (errEl) { errEl.textContent = 'Username must be at least 2 characters'; errEl.classList.remove('hidden'); }
      return;
    }

    // Deploy animation
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.querySelector('.ob-deploy-label').textContent = 'DEPLOYING...';
      submitBtn.querySelector('.ob-deploy-cmd').textContent = '$ compiling profile...';
      submitBtn.querySelector('.ob-deploy-icon').innerHTML = '<i class="icon-sync" style="animation:spin 1s linear infinite"></i>';
    }

    const payload = { username, display_name: displayName || username, avatar, bio };
    if (email) payload.email = email;
    const setupPw = document.getElementById('setupPassword')?.value || '';
    if (setupPw.length >= 4) payload.password = setupPw;
    if (this._oauthUser) {
      payload.provider = this._oauthUser.provider;
      payload.provider_id = this._oauthUser.providerId;
      if (!payload.email && this._oauthUser.email) payload.email = this._oauthUser.email;
    }
    if (this._oauthAvatarUrl) payload.avatar_url = this._oauthAvatarUrl;

    const data = await API.registerUser(payload);
    if (!data.ok) {
      if (errEl) { errEl.textContent = data.error || 'Registration failed'; errEl.classList.remove('hidden'); }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.querySelector('.ob-deploy-label').textContent = 'DEPLOY TO NEXUS';
        submitBtn.querySelector('.ob-deploy-cmd').textContent = '$ make deploy && ./nexora';
        submitBtn.querySelector('.ob-deploy-icon').innerHTML = '<i class="icon-rocket"></i>';
      }
      return;
    }

    localStorage.setItem('cp_arena_username', username);
    this._username = username;
    this._isAdmin = data.user?.role === 'admin';

    const modal = document.getElementById('userSetupModal');
    modal.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    modal.style.opacity = '0';
    modal.style.transform = 'scale(1.08)';
    
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.style.opacity = '';
      modal.style.transform = '';
      this._connectSocialSocket();
      this.toast(`Welcome to the nexus, ${displayName || username}!`, 'success');
      if (this._isAdmin) {
        setTimeout(() => this.toast('Admin mode activated — all levels unlocked', 'success'), 1000);
      }
      location.hash = '#/hub';
      this.route();
      this._updateSidebarPlayer();
      this._autoSync();
      window.monacoReady?.then(() => this._registerAutocomplete());
    }, 800);
  },

  logout() {
    if (!this._username) return;
    const name = this._username;
    localStorage.removeItem('cp_arena_username');
    this._username = null;
    this._isAdmin = false;
    this._oauthUser = null;
    this._oauthAvatarUrl = null;
    try { API.authLogout(); } catch {}
    this.toast(`Logged out. See you soon, ${name}!`, 'info');
    setTimeout(() => {
      location.hash = '#/hub';
      location.reload();
    }, 600);
  },

  /* ===================================================
     SOCIAL PAGE
     =================================================== */
  async renderSocial(el) {
    if (!this._username) {
      el.innerHTML = `
        <div class="page-header">
          <h1><i class="icon-globe" style="font-size:28px"></i> <span class="glitch" data-text="Community">Community</span></h1>
          <p>// identity not found — create a handle to join the network</p>
        </div>
        <div class="squad-gate">
          <div class="squad-gate-icon">⬡</div>
          <h2 class="squad-gate-title">// access denied</h2>
          <p class="squad-gate-sub">node not registered on the nexus</p>
          <button class="btn btn-primary" onclick="App.showUserSetup()"><i class="icon-plus"></i> register node</button>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="page-header">
        <h1><i class="icon-globe" style="font-size:28px"></i> <span class="glitch" data-text="Community">Community</span></h1>
        <p>// connected to nexus · ${this._username} online · squad network active</p>
      </div>
      <div class="squad-tab-nav">
        <button class="squad-tab" data-stab="myprofile" onclick="App._switchSocialTab('myprofile',this)">
          <span class="squad-tab-icon">◈</span>/me
        </button>
        <button class="squad-tab active" data-stab="friends" onclick="App._switchSocialTab('friends',this)">
          <span class="squad-tab-icon">⬡</span>/allies
        </button>
        <button class="squad-tab" data-stab="chat" onclick="App._switchSocialTab('chat',this)">
          <span class="squad-tab-icon">⌘</span>/chat
          <span class="squad-tab-badge hidden" id="chatUnreadBadge">0</span>
        </button>
        <button class="squad-tab" data-stab="rooms" onclick="App._switchSocialTab('rooms',this)">
          <span class="squad-tab-icon">⊞</span>/rooms
        </button>
        <button class="squad-tab" data-stab="feed" onclick="App._switchSocialTab('feed',this)">
          <span class="squad-tab-icon">▸</span>/feed
        </button>
        <button class="squad-tab" data-stab="leaderboard" onclick="App._switchSocialTab('leaderboard',this)">
          <span class="squad-tab-icon">◆</span>/top
        </button>
      </div>
      <div id="socialTabContent" class="squad-content">
        <div id="socialMyProfileTab" class="hidden"></div>
        <div id="socialFriendsTab"></div>
        <div id="socialChatTab" class="hidden"></div>
        <div id="socialRoomsTab" class="hidden"></div>
        <div id="socialFeedTab" class="hidden"></div>
        <div id="socialLeaderboardTab" class="hidden"></div>
      </div>`;

    this._switchSocialTab('friends', el.querySelector('[data-stab="friends"]'));
  },

  _switchSocialTab(tab, btn) {
    document.querySelectorAll('.squad-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    ['myprofile','friends','chat','rooms','feed','leaderboard'].forEach(t => {
      const el = document.getElementById('social' + t.charAt(0).toUpperCase() + t.slice(1) + 'Tab');
      if (el) el.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'myprofile') this._loadMyProfileTab();
    else if (tab === 'friends') this._loadFriendsTab();
    else if (tab === 'chat') this._loadChatTab();
    else if (tab === 'rooms') this._loadRoomsTab();
    else if (tab === 'feed') this._loadFeedTab();
    else if (tab === 'leaderboard') this._loadLeaderboardTab();
  },

  async _loadMyProfileTab() {
    const el = document.getElementById('socialMyProfileTab');
    if (!el || !this._username) return;
    el.innerHTML = '<div class="chat-loading">Loading profile...</div>';
    try {
      const [profile, statsData] = await Promise.all([
        API.getUserProfile(this._username),
        API.getStats(this._username),
      ]);
      if (!profile.ok || !statsData.ok) { el.innerHTML = '<p class="text-muted">Failed to load profile</p>'; return; }
      const u = profile.user;
      const lvl = statsData.level;

      el.innerHTML = `
        <div class="profile-page-hero${this._isAdmin ? ' admin-profile-hero' : ''}" style="margin-top:16px">
          ${this._isAdmin ? '<div class="admin-hero-glow"></div>' : ''}
          <div class="profile-hero-left">
            <div class="profile-hero-badge-large">
              ${this._renderAvatarWithBadge(u.avatar, lvl.level, 96, 36)}
            </div>
            <div style="margin-top:8px">${this._renderRiftBadge(lvl.level, 56)}</div>
          </div>
          <div class="profile-hero-right">
            <div class="profile-hero-name">${this._esc(u.display_name || u.username)} ${this._renderRiftBadge(lvl.level, 22)}${this._isAdmin ? ' <span class="admin-tag">♛ ADMIN</span>' : ''}</div>
            <div class="profile-hero-handle">@${this._esc(u.username)}</div>
            <div class="profile-hero-bio">${this._esc(u.bio) || '// no bio set'}</div>
            <div class="profile-hero-level-tag" style="color:${lvl.color};border-color:${lvl.color};${lvl.glow !== 'none' ? 'box-shadow:' + lvl.glow : ''}">
              ${this._renderRiftBadge(lvl.level, 16)} Level ${lvl.level} — ${lvl.name}
            </div>
            <div class="profile-hero-stats">
              <div class="profile-hero-stat"><span class="profile-hero-stat-val">${statsData.solved}</span><span class="profile-hero-stat-lbl">Solved</span></div>
              <div class="profile-hero-stat"><span class="profile-hero-stat-val">${statsData.accuracy}%</span><span class="profile-hero-stat-lbl">Accuracy</span></div>
              <div class="profile-hero-stat"><span class="profile-hero-stat-val">${statsData.totalXp.toLocaleString()}</span><span class="profile-hero-stat-lbl">Total XP</span></div>
              <div class="profile-hero-stat"><span class="profile-hero-stat-val">${statsData.streak.current}</span><span class="profile-hero-stat-lbl">Day Streak</span></div>
            </div>
          </div>
        </div>
        <div class="card mt-3">
          <div class="card-header"><span class="card-title"><i class="icon-settings" style="font-size:16px"></i> edit.profile()</span></div>
          <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
            <div>
              <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Display Name</label>
              <input type="text" id="editProfileName" class="setup-input" value="${this._esc(u.display_name || '')}" placeholder="Display name" />
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:4px">Bio</label>
              <input type="text" id="editProfileBio" class="setup-input" value="${this._esc(u.bio || '')}" placeholder="Tell us about yourself..." maxlength="200" />
            </div>
            <button class="btn btn-primary" onclick="App._saveProfile()">save --profile</button>
          </div>
        </div>`;
    } catch { el.innerHTML = '<p class="text-muted">Error loading profile</p>'; }
  },

  async _saveProfile() {
    const displayName = document.getElementById('editProfileName')?.value?.trim();
    const bio = document.getElementById('editProfileBio')?.value?.trim();
    const data = await API.registerUser({ username: this._username, display_name: displayName, bio });
    if (data.ok) {
      this.toast('Profile updated!', 'success');
      this._loadMyProfileTab();
      this._updateSidebarPlayer();
    } else {
      this.toast(data.error || 'Failed to update', 'error');
    }
  },

  /* View another user's profile — navigate to full profile page */
  _viewUserProfile(username) {
    location.hash = '#/profile/' + encodeURIComponent(username);
  },

  /* Full profile page renderer — gamified */
  async renderUserProfile(el, username) {
    if (!username) { el.innerHTML = '<p class="text-muted">No user specified</p>'; return; }
    el.innerHTML = '<div class="page-loading"><div class="spinner"></div><p>Loading profile...</p></div>';
    try {
      const data = await API.getUserProfile(username, this._username);
      if (!data.ok) { el.innerHTML = `<div class="empty-state"><p>User <strong>@${this._esc(username)}</strong> not found</p><button class="btn btn-primary" onclick="location.hash='#/hub'">Back to HQ</button></div>`; return; }
      const u = data.user;
      const lvl = data.level || { level: 1, name: 'Bit', color: '#6b7280', glow: 'none', xpInLevel: 0, xpForNext: 100, probsInLevel: 0, probsForNext: 10 };
      const isMe = username === this._username;
      const fs = data.friendStatus || 'none';
      const friendCount = data.friendCount || 0;
      const memberSince = data.memberSince ? new Date(data.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
      const solved = data.stats?.solved || 0;
      const totalXp = data.stats?.totalXp || 0;
      const streak = data.streak || 0;

      // XP ring progress (percentage toward next level)
      const xpPct = lvl.xpForNext > 0 ? Math.min(100, (lvl.xpInLevel / lvl.xpForNext) * 100) : 100;
      const circumference = 2 * Math.PI * 54;
      const xpDash = (xpPct / 100) * circumference;

      // Friend action button
      let friendBtn = '';
      if (!isMe) {
        if (fs === 'friends') friendBtn = `<button class="up-action-btn up-friends-btn" disabled><i class="icon-friends"></i> Friends</button>`;
        else if (fs === 'pending_sent') friendBtn = `<button class="up-action-btn up-pending-btn" disabled><i class="icon-clock"></i> Request Sent</button>`;
        else if (fs === 'pending_received') friendBtn = `<button class="up-action-btn up-accept-btn" onclick="App._acceptFriendFromProfile('${this._esc(username)}')"><i class="icon-friends"></i> Accept Request</button>`;
        else friendBtn = `<button class="up-action-btn up-add-btn" onclick="App._sendFriendFromProfile('${this._esc(username)}')"><i class="icon-friends"></i> Add Friend</button>`;
      }

      let messageBtn = '';
      if (!isMe && fs === 'friends') {
        messageBtn = `<button class="up-action-btn up-msg-btn" onclick="App.openChat('${this._esc(username)}')"><i class="icon-chat"></i> Message</button>`;
      }

      let editBtn = '';
      if (isMe) {
        editBtn = `<button class="up-action-btn up-edit-btn" onclick="App._toggleEditProfile()"><i class="icon-settings"></i> Edit Profile</button>`;
      }

      // Settings + Logout icons (own profile hero corner)
      let heroIcons = '';
      if (isMe) {
        heroIcons = `<div class="up-hero-icons">
          <button class="up-hero-icon" onclick="App.openSettings()" title="Settings"><i class="icon-settings"></i></button>
          <button class="up-hero-icon up-hero-icon-logout" onclick="App.logout()" title="Logout"><i class="icon-logout"></i></button>
        </div>`;
      }

      // Activity feed
      let activityHtml = '';
      if (data.activity && data.activity.length) {
        activityHtml = data.activity.map(a => {
          const time = this._timeAgo(a.created_at);
          let icon = 'icon-bolt', label = a.content || a.type;
          if (a.type === 'solve') { icon = 'icon-check'; label = 'Solved a problem'; }
          else if (a.type === 'friend') { icon = 'icon-friends'; }
          else if (a.type === 'room') { icon = 'icon-house'; }
          return `<div class="up-activity-item"><i class="${icon}"></i><span class="up-activity-text">${this._esc(label)}</span><span class="up-activity-time">${time}</span></div>`;
        }).join('');
      } else {
        activityHtml = '<div class="up-activity-empty">// no recent activity</div>';
      }

      // Level progression nodes
      const LEVEL_NAMES = ['Bit','Byte','Kilobyte','Megabyte','Gigabyte','Terabyte','Petabyte','Exabyte','Zettabyte','Yottabyte','∞ Overflow'];
      const LEVEL_COLORS = ['#6b7280','#84cc16','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#d946ef','#f43f5e','#ef4444','#f59e0b','#fbbf24'];
      let progressionHtml = LEVEL_NAMES.map((name, i) => {
        const lNum = i + 1;
        const reached = lvl.level >= lNum;
        const current = lvl.level === lNum;
        return `<div class="up-lvl-node ${reached ? 'reached' : ''} ${current ? 'current' : ''}">
          <div class="up-lvl-dot" style="${reached && !current ? 'background:' + LEVEL_COLORS[i] + '18;border-color:' + LEVEL_COLORS[i] + '50' : current ? 'border-color:' + LEVEL_COLORS[i] : ''}">
            ${this._renderRiftBadge(lNum, current ? 42 : reached ? 34 : 28)}
          </div>
          <span class="up-lvl-label" style="${reached ? 'color:' + LEVEL_COLORS[i] : ''}">${name}</span>
          ${i < 10 ? '<div class="up-lvl-line' + (lvl.level > lNum ? ' filled' : '') + '"></div>' : ''}
        </div>`;
      }).join('');

      el.innerHTML = `
        <div class="up-container">
          <div class="up-back-row">
            <button class="up-back-btn" onclick="history.back()"><i class="icon-back"></i> Back</button>
          </div>

          <!-- Hero banner -->
          <div class="up-hero ${u.role === 'admin' ? 'up-hero-admin' : ''}">
            <div class="up-hero-bg"></div>
            ${heroIcons}
            <div class="up-hero-content">
              <!-- XP Ring with avatar -->
              <div class="up-avatar-section">
                <div class="up-xp-ring">
                  <svg viewBox="0 0 120 120" class="up-ring-svg">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5"/>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="${lvl.color}" stroke-width="5"
                      stroke-dasharray="${xpDash} ${circumference}" stroke-dashoffset="0"
                      stroke-linecap="round" transform="rotate(-90 60 60)"
                      style="filter:drop-shadow(0 0 6px ${lvl.color});transition:stroke-dasharray 1s ease"/>
                  </svg>
                  <div class="up-ring-avatar">
                    ${this._renderAvatarWithBadge(u.avatar, lvl.level, 80, 30, u.avatar_url)}
                  </div>
                  <div class="up-ring-pct" style="color:${lvl.color}">${Math.round(xpPct)}%</div>
                </div>
                <div class="up-status-dot ${u.status === 'online' || (this._onlineFriends && this._onlineFriends.has(username)) ? 'online' : 'offline'}"></div>
              </div>

              <div class="up-identity">
                <div class="up-name-row">
                  <h1 class="up-name">${this._esc(u.display_name || u.username)}</h1>
                  ${this._renderRiftBadge(lvl.level, 28)}
                  ${u.role === 'admin' ? '<span class="up-admin-badge">♛ ADMIN</span>' : ''}
                </div>
                <div class="up-handle">@${this._esc(u.username)}</div>
                <div class="up-bio">${u.bio ? this._esc(u.bio) : '<span class="text-muted">// no bio set</span>'}</div>
                <div class="up-level-tag" style="color:${lvl.color};border-color:${lvl.color}40;background:${lvl.color}12;${lvl.glow !== 'none' ? 'box-shadow:' + lvl.glow : ''}">
                  ${this._renderRiftBadge(lvl.level, 16)} Level ${lvl.level} — ${lvl.name}
                </div>
                <div class="up-meta-row">
                  <span class="up-meta"><i class="icon-clock"></i> Joined ${memberSince}</span>
                  <span class="up-meta"><i class="icon-friends"></i> ${friendCount} friend${friendCount !== 1 ? 's' : ''}</span>
                  ${streak > 0 ? `<span class="up-meta up-streak-meta"><i class="icon-fire"></i> ${streak} day streak</span>` : ''}
                </div>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="up-actions">
              ${friendBtn}${messageBtn}${editBtn}
            </div>
          </div>

          <!-- Stats grid with animated counters -->
          <div class="up-stats-grid">
            <div class="up-stat-card up-stat-solved">
              <div class="up-stat-glow" style="background:radial-gradient(circle,rgba(34,197,94,0.15) 0%,transparent 70%)"></div>
              <div class="up-stat-icon" style="color:#22c55e"><i class="icon-check"></i></div>
              <div class="up-stat-val">${solved.toLocaleString()}</div>
              <div class="up-stat-lbl">Solved</div>
              <div class="up-stat-bar"><div class="up-stat-bar-fill" style="width:${Math.min(100, (solved / 50) * 100)}%;background:#22c55e"></div></div>
            </div>
            <div class="up-stat-card up-stat-xp">
              <div class="up-stat-glow" style="background:radial-gradient(circle,rgba(96,165,250,0.15) 0%,transparent 70%)"></div>
              <div class="up-stat-icon" style="color:#60a5fa"><i class="icon-bolt"></i></div>
              <div class="up-stat-val">${totalXp.toLocaleString()}</div>
              <div class="up-stat-lbl">Total XP</div>
              <div class="up-stat-bar"><div class="up-stat-bar-fill" style="width:${xpPct}%;background:#60a5fa"></div></div>
            </div>
            <div class="up-stat-card up-stat-streak">
              <div class="up-stat-glow" style="background:radial-gradient(circle,rgba(251,146,60,0.15) 0%,transparent 70%)"></div>
              <div class="up-stat-icon" style="color:#fb923c"><i class="icon-fire"></i></div>
              <div class="up-stat-val">${streak}</div>
              <div class="up-stat-lbl">Day Streak</div>
              <div class="up-stat-bar"><div class="up-stat-bar-fill" style="width:${Math.min(100, (streak / 30) * 100)}%;background:#fb923c"></div></div>
            </div>
            <div class="up-stat-card up-stat-level">
              <div class="up-stat-glow" style="background:radial-gradient(circle,${lvl.color}20 0%,transparent 70%)"></div>
              <div class="up-stat-icon" style="color:${lvl.color}"><i class="icon-trophy"></i></div>
              <div class="up-stat-val">${lvl.level}</div>
              <div class="up-stat-lbl">Nexora Level</div>
              <div class="up-stat-bar"><div class="up-stat-bar-fill" style="width:${(lvl.level / 11) * 100}%;background:${lvl.color}"></div></div>
            </div>
          </div>

          <!-- Level Progression Timeline -->
          <div class="up-section-card" onclick="location.hash='#/nexus'" style="cursor:pointer" title="View full progression in Progress section">
            <div class="up-section-header">
              <span class="up-section-title"><i class="icon-star"></i> Nexora Progression</span>
              <span class="up-section-sub">Level ${lvl.level} of 11${lvl.level < 11 ? ' — ' + lvl.xpInLevel.toLocaleString() + '/' + lvl.xpForNext.toLocaleString() + ' XP to next' : ' — MAX LEVEL'} <i class="icon-arrow-right" style="font-size:11px;opacity:0.5"></i></span>
            </div>
            <div class="up-progression">${progressionHtml}</div>
          </div>

          ${isMe ? `<!-- Edit Profile Modal Overlay -->
          <div class="ep-modal-overlay hidden" id="upEditOverlay" onclick="App._closeEditIfOverlay(event)">
            <div class="ep-modal">
              <div class="ep-modal-header">
                <span class="ep-modal-title"><i class="icon-settings"></i> Edit Profile</span>
                <button class="ep-modal-close" onclick="App._toggleEditProfile()">&times;</button>
              </div>
              <div class="ep-modal-body">
                <!-- Avatar Editor -->
                <div class="up-edit-field">
                  <label class="up-edit-label">Avatar</label>
                  <div class="up-avatar-editor">
                    <div class="up-avatar-preview" id="upAvatarPreview">
                      ${this._renderAvatar(u.avatar, u.avatar_url)}
                    </div>
                    <div class="up-avatar-actions">
                      <label class="btn btn-ghost btn-sm up-avatar-upload-btn">
                        <i class="icon-bolt"></i> Upload Photo
                        <input type="file" id="upAvatarFileInput" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="App._handleAvatarUpload(this)"/>
                      </label>
                      <span class="up-avatar-or">or pick an icon:</span>
                    </div>
                    <div class="up-avatar-picker" id="upAvatarPicker">
                      ${['coder','fox','cat','wolf','sword','shield','trophy','diamond','fire','bolt','star','target','crown','robot','gamepad','brain','tree','globe','moon','dragon'].map(a =>
                        `<button class="up-avatar-pick-btn${u.avatar === a ? ' selected' : ''}" data-avatar="${a}" onclick="App._pickEditAvatar(this)"><i class="${this._avatarIconMap[a] || 'icon-avatar-coder'}"></i></button>`
                      ).join('')}
                    </div>
                  </div>
                </div>
                <div class="up-edit-divider"></div>
                <div class="up-edit-field">
                  <label class="up-edit-label">Username</label>
                  <input type="text" id="upEditUsername" class="up-edit-input" value="${this._esc(u.username)}" maxlength="20" />
                </div>
                <div class="up-edit-field">
                  <label class="up-edit-label">Display Name</label>
                  <input type="text" id="upEditDisplayName" class="up-edit-input" value="${this._esc(u.display_name || '')}" maxlength="30" />
                </div>
                <div class="up-edit-field">
                  <label class="up-edit-label">Bio</label>
                  <input type="text" id="upEditBio" class="up-edit-input" value="${this._esc(u.bio || '')}" placeholder="Tell us about yourself..." maxlength="200" />
                </div>
                <div class="up-edit-divider"></div>
                <div class="up-edit-field">
                  <label class="up-edit-label">Current Password</label>
                  <input type="password" id="upEditCurrentPw" class="up-edit-input" placeholder="required to change password" maxlength="64" />
                </div>
                <div class="up-edit-field">
                  <label class="up-edit-label">New Password</label>
                  <input type="password" id="upEditNewPw" class="up-edit-input" placeholder="leave blank to keep current" maxlength="64" />
                </div>
                <div class="up-edit-feedback" id="upEditFeedback"></div>
                <button class="btn btn-primary ep-modal-save" onclick="App._saveProfileEdit()" id="upEditSaveBtn">save --profile</button>
                <div class="up-edit-divider"></div>
                <div class="up-edit-bottom-row">
                  <button class="btn btn-ghost btn-sm" onclick="App.openSettings()"><i class="icon-settings"></i> Settings</button>
                  <button class="up-logout-btn" onclick="App.logout()"><i class="icon-logout"></i> Logout</button>
                </div>
              </div>
            </div>
          </div>` : ''}

          <!-- Achievements -->
          <div class="up-section-card" id="upAchievementsSection">
            <div class="up-section-header">
              <span class="up-section-title"><i class="icon-trophy"></i> Achievements</span>
              <span class="up-section-sub" id="upAchieveBadge"></span>
            </div>
            <div class="achievements-grid" id="upAchievementsGrid">
              <div class="up-activity-empty">Loading achievements...</div>
            </div>
          </div>

          <!-- Two column: Activity + Rank detail -->
          <div class="up-two-col">
            <div class="up-col">
              <div class="up-section-card">
                <div class="up-section-header">
                  <span class="up-section-title"><i class="icon-bolt"></i> Recent Activity</span>
                </div>
                <div class="up-activity-list">${activityHtml}</div>
              </div>
            </div>
            <div class="up-col">
              <div class="up-section-card">
                <div class="up-section-header">
                  <span class="up-section-title"><i class="icon-trophy"></i> Rank Card</span>
                </div>
                <div class="up-rank-card-body">
                  <div class="up-rank-big-badge">${this._renderRiftBadge(lvl.level, 64)}</div>
                  <div class="up-rank-title" style="color:${lvl.color}">${lvl.name}</div>
                  <div class="up-rank-subtitle">Nexora Level ${lvl.level}</div>
                  <div class="up-rank-bars">
                    <div class="up-rank-bar-row">
                      <span class="up-rank-bar-label">XP</span>
                      <div class="up-rank-bar-track"><div class="up-rank-bar-fill" style="width:${xpPct}%;background:${lvl.color}"></div></div>
                      <span class="up-rank-bar-val">${Math.round(xpPct)}%</span>
                    </div>
                    <div class="up-rank-bar-row">
                      <span class="up-rank-bar-label">Probs</span>
                      <div class="up-rank-bar-track"><div class="up-rank-bar-fill" style="width:${lvl.probsForNext > 0 ? Math.min(100, (lvl.probsInLevel / lvl.probsForNext) * 100) : 100}%;background:${lvl.color}"></div></div>
                      <span class="up-rank-bar-val">${lvl.probsForNext > 0 ? Math.round((lvl.probsInLevel / lvl.probsForNext) * 100) : 100}%</span>
                    </div>
                  </div>
                  ${lvl.level < 11 ? `<div class="up-rank-next">Next: <strong style="color:${LEVEL_COLORS[lvl.level]}">${LEVEL_NAMES[lvl.level]}</strong></div>` : '<div class="up-rank-next up-rank-max">★ MAXIMUM NEXORA LEVEL ★</div>'}
                </div>
              </div>
            </div>
          </div>
        </div>`;

      // Load achievements
      try {
        const stats = await API.getStats(this._username);
        if (stats.ok && stats.achievements) {
          const unlocked = stats.achievements.filter(a => a.unlocked_at).length;
          const badge = document.getElementById('upAchieveBadge');
          if (badge) badge.textContent = `${unlocked}/${stats.achievements.length} unlocked`;
          const grid = document.getElementById('upAchievementsGrid');
          if (grid) {
            grid.innerHTML = stats.achievements.map(a => {
              const isUnlocked = !!a.unlocked_at;
              const pct = Math.min(100, Math.round(a.progress / a.target * 100));
              const icon = this._achieveIconMap[a.icon] || '<i class="icon-medal"></i>';
              return `<div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon-wrap">${icon}</div>
                <div class="achievement-title">${a.title}</div>
                <div class="achievement-desc">${a.description}</div>
                <div class="achievement-xp-reward">+${a.xp_reward || 0} XP</div>
                <div class="achievement-progress"><div class="achievement-progress-fill" style="width:${pct}%"></div></div>
                <div class="text-sm text-muted mt-2">${a.progress}/${a.target}</div>
              </div>`;
            }).join('');
          }
        }
      } catch {}
    } catch (e) {
      console.error('[Profile] renderUserProfile error:', e);
      el.innerHTML = `<div class="empty-state"><p>Error loading profile</p><pre style="font-size:11px;color:#f87171;text-align:left;padding:8px;background:#1e1e2e;border-radius:6px;overflow:auto;max-width:480px;margin:8px auto">${e && e.message ? e.message : String(e)}</pre><button class="btn btn-primary" onclick="location.hash='#/hub'">Back to HQ</button></div>`;
    }
  },

  async _sendFriendFromProfile(username) {
    const data = await API.sendFriendRequest(this._username, username);
    if (data.ok) {
      this.toast(`Friend request sent to @${username}`, 'success');
      if (this._socialSocket) this._socialSocket.emit('notify-friend-request', { to: username, from: this._username });
      this.renderUserProfile(document.getElementById('pageContent'), username);
    } else {
      this.toast(data.error || 'Failed to send request', 'error');
    }
  },

  async _acceptFriendFromProfile(username) {
    // Find the pending request ID
    const reqData = await API.getFriendRequests(this._username);
    if (reqData.ok) {
      const req = reqData.incoming.find(r => r.username === username);
      if (req) {
        await API.acceptFriendRequest(req.id);
        this.toast(`You and @${username} are now friends!`, 'success');
        this.renderUserProfile(document.getElementById('pageContent'), username);
        return;
      }
    }
    this.toast('Could not find friend request', 'error');
  },

  _toggleEditProfile() {
    const overlay = document.getElementById('upEditOverlay');
    if (overlay) {
      overlay.classList.toggle('hidden');
      if (!overlay.classList.contains('hidden')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  },

  _closeEditIfOverlay(e) {
    if (e.target.id === 'upEditOverlay') this._toggleEditProfile();
  },

  _pickEditAvatar(btn) {
    document.querySelectorAll('.up-avatar-pick-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this._editAvatar = btn.dataset.avatar;
    this._editAvatarUrl = null;
    const preview = document.getElementById('upAvatarPreview');
    if (preview) preview.innerHTML = this._renderAvatar(this._editAvatar, null);
  },

  async _handleAvatarUpload(input) {
    const file = input.files[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.toast('Only PNG, JPG, or WebP allowed', 'error'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toast('Image must be under 2 MB', 'error'); return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      const preview = document.getElementById('upAvatarPreview');
      if (preview) preview.innerHTML = `<img src="${base64}" class="avatar-img" alt="avatar"/>`;
      try {
        const res = await API.uploadAvatar({ username: this._username, image: base64 });
        if (res.ok) {
          this._editAvatarUrl = res.avatarUrl;
          this._editAvatar = null;
          document.querySelectorAll('.up-avatar-pick-btn').forEach(b => b.classList.remove('selected'));
          this.toast('Avatar uploaded!', 'success');
        } else {
          this.toast(res.error || 'Upload failed', 'error');
        }
      } catch {
        this.toast('Upload error', 'error');
      }
    };
    reader.readAsDataURL(file);
  },

  async _saveProfileEdit() {
    const btn = document.getElementById('upEditSaveBtn');
    const feedback = document.getElementById('upEditFeedback');
    const newUsername = document.getElementById('upEditUsername')?.value?.trim();
    const displayName = document.getElementById('upEditDisplayName')?.value?.trim();
    const bio = document.getElementById('upEditBio')?.value?.trim();
    const currentPw = document.getElementById('upEditCurrentPw')?.value || '';
    const newPw = document.getElementById('upEditNewPw')?.value || '';
    
    if (btn) { btn.disabled = true; btn.textContent = 'saving...'; }
    if (feedback) { feedback.textContent = ''; feedback.className = 'up-edit-feedback'; }

    const payload = { currentUsername: this._username };
    if (newUsername && newUsername !== this._username) payload.newUsername = newUsername;
    if (displayName !== undefined) payload.displayName = displayName;
    if (bio !== undefined) payload.bio = bio;
    if (this._editAvatar) { payload.avatar = this._editAvatar; payload.avatarUrl = null; }
    if (this._editAvatarUrl) payload.avatarUrl = this._editAvatarUrl;
    if (newPw.length >= 4) {
      payload.password = newPw;
      payload.currentPassword = currentPw;
    } else if (newPw.length > 0 && newPw.length < 4) {
      if (feedback) { feedback.textContent = '// password must be at least 4 characters'; feedback.className = 'up-edit-feedback up-edit-error'; }
      if (btn) { btn.disabled = false; btn.textContent = 'save --profile'; }
      return;
    }

    try {
      const res = await API.updateProfile(payload);
      if (res.ok) {
        if (res.usernameChanged && res.user) {
          localStorage.setItem('cp_arena_username', res.user.username);
          this._username = res.user.username;
        }
        this.toast('Profile updated!', 'success');
        this._updateSidebarPlayer();
        this.renderUserProfile(document.getElementById('pageContent'), this._username);
      } else {
        if (feedback) { feedback.textContent = `// ${res.error || 'update failed'}`; feedback.className = 'up-edit-feedback up-edit-error'; }
      }
    } catch (e) {
      if (feedback) { feedback.textContent = '// connection error'; feedback.className = 'up-edit-feedback up-edit-error'; }
    }
    if (btn) { btn.disabled = false; btn.textContent = 'save --profile'; }
  },

  async _loadFriendsTab() {
    const el = document.getElementById('socialFriendsTab');
    if (!el) return;
    const [friendsData, requestsData] = await Promise.all([
      API.getFriends(this._username),
      API.getFriendRequests(this._username),
    ]);

    let html = `
      <div class="squad-allies-header">
        <h3>// node registry</h3>
        <div class="input-icon-wrap" style="position:relative;max-width:220px">
          <i class="icon-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px;pointer-events:none"></i>
          <input type="text" id="friendSearchInput" class="squad-search-input" placeholder="search handle..." style="padding-left:30px"
            onkeydown="if(event.key==='Enter'){App._searchFriend()}" />
        </div>
        <button class="btn btn-primary btn-sm" onclick="App._searchFriend()">+ add</button>
      </div>
      <div id="friendSearchResults" style="margin-bottom:10px"></div>`;

    // Pending requests
    if (requestsData.ok && requestsData.incoming.length) {
      html += `<div class="squad-section-label" style="color:var(--warning)">pending (${requestsData.incoming.length})</div>
        <div class="squad-friend-grid" style="margin-bottom:16px">`;
      for (const r of requestsData.incoming) {
        html += `<div class="squad-ally-card pending">
          <div class="squad-ally-avatar" onclick="App._viewUserProfile('${this._esc(r.username)}')" style="cursor:pointer">${this._avatarInitials(r.display_name || r.username)}</div>
          <div class="squad-ally-info">
            <div class="squad-ally-name" onclick="App._viewUserProfile('${this._esc(r.username)}')" style="cursor:pointer">${this._esc(r.display_name || r.username)}</div>
            <div class="squad-ally-handle">@${this._esc(r.username)}</div>
            <div class="squad-ally-status" style="color:var(--warning)">↗ ally request incoming</div>
          </div>
          <div class="squad-ally-actions">
            <button class="squad-action-btn success" onclick="App._acceptFriend(${r.id})" title="Accept">✓</button>
            <button class="squad-action-btn danger" onclick="App._rejectFriend(${r.id})" title="Decline">✕</button>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    // Friends list
    const friends = (friendsData.ok ? friendsData.friends : []);
    const online = friends.filter(f => this._onlineFriends.has(f.username) || f.status === 'online');
    const offline = friends.filter(f => !this._onlineFriends.has(f.username) && f.status !== 'online');
    online.forEach(f => this._onlineFriends.add(f.username));

    if (online.length > 0) {
      html += `<div class="squad-section-label" style="color:var(--success)">online (${online.length})</div>
        <div class="squad-friend-grid" style="margin-bottom:14px">`;
      for (const f of online) {
        html += `<div class="squad-ally-card online">
          <div class="squad-ally-avatar" onclick="App._viewUserProfile('${this._esc(f.username)}')" style="cursor:pointer">${this._avatarInitials(f.display_name || f.username)}</div>
          <div class="squad-ally-info">
            <div class="squad-ally-name">${this._esc(f.display_name || f.username)}</div>
            <div class="squad-ally-handle">@${this._esc(f.username)}</div>
            <div class="squad-ally-status online">● online</div>
          </div>
          <div class="squad-ally-actions">
            <button class="squad-action-btn" onclick="App._switchSocialTab('chat');setTimeout(()=>App._openConversation('${this._esc(f.username)}'),100)" title="DM">⌘</button>
            <button class="squad-action-btn" onclick="App._challengeFriend('${this._esc(f.username)}')" title="Challenge">⚔</button>
            <button class="squad-action-btn" onclick="App._inviteToRoom('${this._esc(f.username)}')" title="Invite to room">⊞</button>
            <button class="squad-action-btn" onclick="App._viewUserProfile('${this._esc(f.username)}')" title="Profile">◈</button>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    if (offline.length > 0) {
      html += `<div class="squad-section-label">offline (${offline.length})</div>
        <div class="squad-friend-grid">`;
      for (const f of offline) {
        html += `<div class="squad-ally-card">
          <div class="squad-ally-avatar" onclick="App._viewUserProfile('${this._esc(f.username)}')" style="cursor:pointer" style="opacity:0.6">${this._avatarInitials(f.display_name || f.username)}</div>
          <div class="squad-ally-info">
            <div class="squad-ally-name" style="opacity:0.7">${this._esc(f.display_name || f.username)}</div>
            <div class="squad-ally-handle">@${this._esc(f.username)}</div>
            <div class="squad-ally-status offline">${f.last_seen ? '↻ ' + this._timeAgo(f.last_seen) : '● offline'}</div>
          </div>
          <div class="squad-ally-actions">
            <button class="squad-action-btn" onclick="App._switchSocialTab('chat');setTimeout(()=>App._openConversation('${this._esc(f.username)}'),100)" title="DM">⌘</button>
            <button class="squad-action-btn" onclick="App._viewUserProfile('${this._esc(f.username)}')" title="Profile">◈</button>
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    if (!friends.length && !(requestsData.ok && requestsData.incoming.length)) {
      html += `<div class="empty-state">
        <div style="font-size:40px;opacity:0.15;font-family:var(--mono)">⬡</div>
        <div style="font-family:var(--title);font-size:16px;color:var(--text-muted);letter-spacing:2px;margin:8px 0">// allies[].length === 0</div>
        <p style="color:var(--text-muted);font-family:var(--mono);font-size:12px">search handles above to connect nodes</p>
      </div>`;
    }

    el.innerHTML = html;
  },

  _avatarInitials(name) {
    if (!name) return '?';
    return name.toUpperCase().slice(0, 2);
  },

  async _searchFriend() {
    const input = document.getElementById('friendSearchInput');
    const q = input?.value?.trim();
    if (!q) return;
    const data = await API.searchUsers(q);
    const el = document.getElementById('friendSearchResults');
    if (!data.ok || !data.users.length) {
      el.innerHTML = '<p style="padding:8px;font-family:var(--mono);font-size:12px;color:var(--text-muted)">// no users found</p>';
      return;
    }
    el.innerHTML = data.users
      .filter(u => u.username !== this._username)
      .map(u => `<div class="squad-ally-card" style="margin-top:6px;margin-bottom:4px">
        <div class="squad-ally-avatar" onclick="App._viewUserProfile('${this._esc(u.username)}')" style="cursor:pointer">${this._avatarInitials(u.display_name || u.username)}</div>
        <div class="squad-ally-info">
          <div class="squad-ally-name" onclick="App._viewUserProfile('${this._esc(u.username)}')" style="cursor:pointer">${this._esc(u.display_name || u.username)}</div>
          <div class="squad-ally-handle">@${this._esc(u.username)}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="App._sendFriendRequest('${this._esc(u.username)}')">+ add</button>
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
    this.toast(`Room invite sent to @${username}`, 'info');
  },

  _challengeFriend(username) {
    // Send challenge notification to friend for a random problem
    if (this._socialSocket) {
      this._socialSocket.emit('challenge-friend', {
        from: this._username,
        to: username,
        problemTitle: 'Random Problem'
      });
    }
    this.toast(`⚔️ Challenge sent to @${username}!`, 'success');
  },

  /* ===================================================
     INLINE CHAT TAB
     =================================================== */
  _activeChatUser: null,
  _chatUnreads: {},
  _typingTimers: {},

  async _loadChatTab() {
    const el = document.getElementById('socialChatTab');
    if (!el) return;
    const friendsData = await API.getFriends(this._username);
    const friends = friendsData.ok ? friendsData.friends : [];
    const unreadData = await API.getUnreadMessages(this._username);
    if (unreadData.ok) {
      unreadData.counts.forEach(c => { this._chatUnreads[c.from_user] = c.count; });
    }

    el.innerHTML = `<div class="squad-chat-layout">
      <div class="squad-conv-list">
        <div class="squad-conv-search-wrap">
          <input class="squad-conv-search" placeholder="// filter nodes..." oninput="App._filterChatConvs(this.value)">
        </div>
        <div class="squad-conv-items" id="chatConvList">
          ${friends.length ? friends.map(f => {
            const isOnline = this._onlineFriends.has(f.username) || f.status === 'online';
            const unread = this._chatUnreads[f.username] || 0;
            return `<div class="squad-conv-item ${this._activeChatUser === f.username ? 'active' : ''}" data-username="${this._esc(f.username)}" onclick="App._openConversation('${this._esc(f.username)}')">
              <div class="squad-conv-avatar">
                ${this._avatarInitials(f.display_name || f.username)}
                ${isOnline ? '<div class="squad-conv-online-dot"></div>' : ''}
              </div>
              <div class="squad-conv-info">
                <div class="squad-conv-name">${this._esc(f.display_name || f.username)}</div>
                <div class="squad-conv-preview" id="convPreview_${this._esc(f.username)}">
                  ${this._typingUsers?.[f.username] ? '// typing...' : (isOnline ? '● online' : '◌ offline')}
                </div>
              </div>
              <div class="squad-conv-meta">
                ${unread > 0 ? `<div class="squad-conv-unread">${unread}</div>` : ''}
              </div>
            </div>`;
          }).join('') : '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px;font-family:var(--mono)">// allies[].length === 0<br><span style="opacity:0.5">add friends first</span></div>'}
        </div>
      </div>
      <div class="squad-chat-window" id="chatMainWindow">
        <div class="squad-chat-empty">
          <div class="squad-chat-empty-icon">⌘</div>
          <div class="squad-chat-empty-text">// select a node to establish link</div>
        </div>
      </div>
    </div>`;

    // If there was an active chat, reopen it
    if (this._activeChatUser && friends.some(f => f.username === this._activeChatUser)) {
      this._openConversation(this._activeChatUser);
    }
  },

  _filterChatConvs(q) {
    document.querySelectorAll('.squad-conv-item').forEach(el => {
      const name = el.dataset.username || '';
      el.style.display = name.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  },

  async _openConversation(username) {
    this._activeChatUser = username;

    // Update active state in conv list
    document.querySelectorAll('.squad-conv-item').forEach(el => {
      el.classList.toggle('active', el.dataset.username === username);
    });

    // Clear unread for this user
    this._chatUnreads[username] = 0;
    const convItem = document.querySelector(`.squad-conv-item[data-username="${username}"]`);
    if (convItem) convItem.querySelector('.squad-conv-unread')?.remove();

    // Mark as read via socket
    if (this._socialSocket) {
      this._socialSocket.emit('mark-messages-read', { from: username, to: this._username });
    }

    const win = document.getElementById('chatMainWindow');
    if (!win) return;

    // Get friend info
    const friendsData = await API.getFriends(this._username);
    const friend = (friendsData.ok ? friendsData.friends : []).find(f => f.username === username);
    const isOnline = this._onlineFriends.has(username);

    win.innerHTML = `
      <div class="squad-chat-win-header">
        <div class="squad-chat-win-avatar">${this._avatarInitials(friend?.display_name || username)}</div>
        <div style="flex:1">
          <div class="squad-chat-win-name">${this._esc(friend?.display_name || username)}</div>
          <div class="squad-chat-win-status ${isOnline ? 'online' : ''}" id="chatWinStatus_${this._esc(username)}">
            ${isOnline ? '● online' : '◌ offline'}
          </div>
        </div>
        <div class="squad-chat-win-actions">
          <button class="squad-action-btn" onclick="App._viewUserProfile('${this._esc(username)}')" title="Profile">◈</button>
          <button class="squad-action-btn" onclick="App._challengeFriend('${this._esc(username)}')" title="Challenge">⚔</button>
        </div>
      </div>
      <div class="squad-chat-messages" id="chatWinMessages_${this._esc(username)}"></div>
      <div class="squad-typing-indicator" id="chatWinTyping_${this._esc(username)}"></div>
      <div style="position:relative">
        <div class="squad-emoji-picker hidden" id="emojiPicker_${this._esc(username)}">
          ${['😀','😂','🔥','❤️','👍','💯','🎉','😎','🤔','💪','⚡','🎯','🏆','✅','😅','🙏'].map(e =>
            `<button onclick="App._insertEmoji('${this._esc(username)}','${e}')">${e}</button>`
          ).join('')}
        </div>
      </div>
      <div class="squad-chat-input-row">
        <button class="squad-action-btn" onclick="App._toggleEmojiPicker('${this._esc(username)}')" title="Emoji" style="flex-shrink:0">☺</button>
        <textarea class="squad-chat-textarea" id="chatWinInput_${this._esc(username)}" placeholder="// message @${this._esc(username)}... (Enter send · Shift+Enter newline)"
          onkeydown="App._chatWinKeydown(event,'${this._esc(username)}')"
          oninput="App._chatWinTyping('${this._esc(username)}')"></textarea>
        <button class="btn btn-primary btn-sm" onclick="App._sendChatWin('${this._esc(username)}')" style="flex-shrink:0;padding:8px 14px">▶</button>
      </div>`;

    // Load messages
    const msgEl = document.getElementById(`chatWinMessages_${username}`);
    const data = await API.getMessages(this._username, username);
    if (data.ok && data.messages.length) {
      let lastDate = null;
      for (const msg of data.messages) {
        const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : null;
        if (msgDate && msgDate !== lastDate) {
          lastDate = msgDate;
          const today = new Date().toDateString();
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const label = msgDate === today ? 'Today' : msgDate === yesterday ? 'Yesterday' : new Date(msg.created_at).toLocaleDateString();
          msgEl.insertAdjacentHTML('beforeend', `<div class="chat-date-divider">${label}</div>`);
        }
        this._appendInlineChatMessage(msg, username);
      }
    } else {
      msgEl.innerHTML = `<div class="chat-no-selection" style="min-height:200px">
        <div class="chat-no-icon" style="font-size:40px;opacity:0.25"><i class="icon-chat"></i></div>
        <p style="color:var(--text-muted)">No messages yet — say hi!</p>
      </div>`;
    }
    msgEl.scrollTop = msgEl.scrollHeight;
    this._checkUnreadMessages();
  },

  _appendInlineChatMessage(msg, targetUser) {
    const container = document.getElementById(`chatWinMessages_${targetUser}`);
    if (!container) return;
    const isMine = msg.from_user === this._username;
    const time = this._formatTime(msg.created_at);

    const msgId = msg.id || Date.now();
    const noEmptyPlaceholder = container.querySelector('.squad-chat-empty');
    if (noEmptyPlaceholder) noEmptyPlaceholder.remove();

    // Detect code blocks
    const content = msg.content || '';
    let bubbleHtml;
    const codeMatch = content.match(/^```(\w*)\n?([\s\S]*?)```$/);
    if (codeMatch) {
      const lang = codeMatch[1] || 'code';
      const code = this._esc(codeMatch[2]);
      bubbleHtml = `<div class="squad-bubble has-code">
        <div class="squad-bubble-code">
          <div class="squad-bubble-code-hdr">
            <span class="squad-bubble-code-lang">${lang}</span>
            <button class="squad-bubble-code-copy" onclick="navigator.clipboard.writeText(${JSON.stringify(codeMatch[2])})">copy</button>
          </div>
          <pre>${code}</pre>
        </div>
      </div>`;
    } else {
      bubbleHtml = `<div class="squad-bubble">${this._esc(content).replace(/\n/g,'<br>')}</div>`;
    }

    container.insertAdjacentHTML('beforeend', `
      <div class="squad-msg-wrap ${isMine ? 'mine' : 'theirs'}" data-msgid="${msgId}" style="position:relative">
        ${bubbleHtml}
        <button class="squad-react-trigger" onclick="App._showReactionBar(${msgId},'${targetUser}',this)">+ react</button>
        <div class="squad-msg-meta">
          <span>${time}</span>
          ${isMine ? '<span class="squad-read-receipt" id="rr_' + msgId + '"></span>' : ''}
        </div>
        <div class="squad-msg-reactions" id="reactions_${msgId}"></div>
      </div>`);
    container.scrollTop = container.scrollHeight;
  },

  _chatWinKeydown(e, username) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._sendChatWin(username);
    }
  },

  _chatTypingTimer: null,
  _chatWinTyping(username) {
    if (!this._socialSocket) return;
    this._socialSocket.emit('typing-start', { from: this._username, to: username });
    clearTimeout(this._chatTypingTimer);
    this._chatTypingTimer = setTimeout(() => {
      if (this._socialSocket) this._socialSocket.emit('typing-stop', { from: this._username, to: username });
    }, 2500);
  },

  async _sendChatWin(username) {
    const input = document.getElementById(`chatWinInput_${username}`);
    if (!input || !input.value.trim()) return;
    const content = input.value.trim();
    input.value = '';
    input.style.height = '';
    if (this._socialSocket) {
      this._socialSocket.emit('typing-stop', { from: this._username, to: username });
      this._socialSocket.emit('direct-message', { from: this._username, to: username, content });
    } else {
      await API.sendMessage(this._username, username, content);
    }
    this._appendInlineChatMessage({ from_user: this._username, content, created_at: new Date().toISOString() }, username);
  },

  _toggleEmojiPicker(username) {
    const picker = document.getElementById(`emojiPicker_${username}`);
    if (picker) picker.classList.toggle('hidden');
    document.addEventListener('click', (e) => {
      if (!picker?.contains(e.target) && !e.target.closest('.chat-emoji-btn')) {
        picker?.classList.add('hidden');
      }
    }, { once: true });
  },

  _insertEmoji(username, emoji) {
    const input = document.getElementById(`chatWinInput_${username}`);
    if (input) { input.value += emoji; input.focus(); }
    document.getElementById(`emojiPicker_${username}`)?.classList.add('hidden');
  },

  _showReactionBar(msgId, username, btn) {
    const existing = document.getElementById('floatingReactionBar');
    if (existing) existing.remove();
    const reactions = ['👍','❤️','😂','🔥','😮','😢','🎉','💯'];
    const bar = document.createElement('div');
    bar.id = 'floatingReactionBar';
    bar.className = 'squad-reaction-bar';
    bar.style.cssText = 'position:fixed;z-index:9999';
    bar.innerHTML = reactions.map(e => `<button onclick="App._reactToMsg(${msgId},'${e}','${this._esc(username)}',this.closest('.squad-reaction-bar'))">${e}</button>`).join('');
    document.body.appendChild(bar);
    const rect = btn.getBoundingClientRect();
    bar.style.left = Math.min(rect.left, window.innerWidth - 280) + 'px';
    bar.style.top = (rect.top - bar.offsetHeight - 8) + 'px';
    setTimeout(() => {
      document.addEventListener('click', (e) => { if (!bar.contains(e.target)) bar.remove(); }, { once: true });
    }, 50);
  },

  async _reactToMsg(msgId, emoji, username) {
    document.getElementById('floatingReactionBar')?.remove();
    if (!msgId || msgId.toString().startsWith('1')) return; // skip optimistic IDs
    const data = await API.reactToMessage(msgId, this._username, emoji);
    if (data.ok) {
      const reactEl = document.getElementById(`reactions_${msgId}`);
      if (reactEl) {
        reactEl.innerHTML = Object.entries(data.reactions).map(([e, users]) =>
          `<span class="squad-reaction-pill ${users.includes(this._username) ? 'mine' : ''}" onclick="App._reactToMsg(${msgId},'${e}','${username}')">
            ${e} <span class="squad-reaction-count">${users.length}</span>
          </span>`
        ).join('');
      }
    }
  },

  _typingUsers: {},

  /* ===================================================
     CHAT SIDEBAR (DMs) — kept for backwards compat
     =================================================== */
  async openChat(username) {
    // Switch to chat tab and open the conversation
    location.hash = '#/social';
    setTimeout(async () => {
      const chatTab = document.querySelector('[data-stab="chat"]');
      if (chatTab) { chatTab.click(); }
      await new Promise(r => setTimeout(r, 200));
      this._openConversation(username);
    }, 100);
  },

  async openChatSidebar(username) {
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
      <div class="squad-section-label">spawn a room</div>
      <div class="create-room-form" style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;margin-bottom:20px;max-width:500px">
        <input type="text" id="roomNameInput" class="contest-form-input" placeholder="Room name..." maxlength="50" style="width:100%;margin-bottom:8px" />
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
          <input type="number" id="roomProblemId" class="contest-form-input" placeholder="Problem ID (opt)" style="flex:1;min-width:130px" />
          <select id="roomTopicSelect" class="contest-form-select" style="flex:1;min-width:130px">
            <option value="">Topic tag...</option>
            <option value="dp">Dynamic Programming</option>
            <option value="graphs">Graphs</option>
            <option value="trees">Trees</option>
            <option value="strings">Strings</option>
            <option value="math">Math</option>
            <option value="greedy">Greedy</option>
            <option value="interview">Interview Prep</option>
            <option value="general">General</option>
          </select>
          <label style="display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:12px;color:var(--text-secondary);cursor:pointer;white-space:nowrap">
            <input type="checkbox" id="roomVoiceCheck" style="accent-color:var(--brand)" /> ♪ voice
          </label>
        </div>
        <button class="btn btn-primary btn-sm" onclick="App._createSolveRoom()">+ spawn room</button>
      </div>

      <div class="squad-section-label" style="margin-bottom:12px">
        active rooms (${data.ok ? data.rooms.length : 0})
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
          <input type="text" id="joinRoomCode" class="contest-form-input" placeholder="6-digit code" style="width:110px;padding:5px 10px;font-family:var(--mono);letter-spacing:2px" maxlength="6" />
          <button class="btn btn-primary btn-sm" onclick="App._joinRoomByCode()">join</button>
        </div>
      </div>`;

    if (data.ok && data.rooms.length) {
      html += `<div class="squad-rooms-grid">`;
      for (const r of data.rooms) {
        const topic = r.topic || '';
        const topicLabel = { dp: 'DP', graphs: 'Graphs', trees: 'Trees', strings: 'Strings', math: 'Math', greedy: 'Greedy', interview: 'Interview', general: 'General' }[topic] || topic;
        const fillPct = Math.min(100, Math.round((r.member_count / r.max_members) * 100));
        const fillColor = fillPct >= 80 ? 'var(--danger)' : fillPct >= 50 ? 'var(--warning)' : 'var(--success)';
        html += `<div class="squad-room-card">
          <div class="squad-room-header">
            <span class="squad-room-name">${this._esc(r.name)}</span>
            <span class="squad-room-code">#${r.id}</span>
          </div>
          <div class="squad-room-meta">
            <div class="squad-room-detail">◈ @${this._esc(r.creator)}</div>
            ${r.problem_title ? `<div class="squad-room-detail">▸ ${this._esc(r.problem_title)}</div>` : ''}
          </div>
          <div class="squad-room-tags">
            ${topicLabel ? `<span class="squad-room-tag">${topicLabel}</span>` : ''}
            ${r.is_voice ? '<span class="squad-room-tag" style="color:var(--brand-light)">♪ voice</span>' : ''}
          </div>
          <div class="squad-room-fill-bar">
            <div class="squad-room-fill-label"><span>capacity</span><span>${r.member_count}/${r.max_members}</span></div>
            <div class="squad-room-fill-track"><div class="squad-room-fill-value" style="width:${fillPct}%;background:${fillColor}"></div></div>
          </div>
          <button class="btn btn-primary btn-sm full-width" onclick="App.joinSolveRoom('${r.id}')">▶ join room</button>
        </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div style="padding:30px;text-align:center;color:var(--text-muted);font-family:var(--mono);font-size:12px">// no rooms spawned yet</div>`;
    }
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
        language: (this._langs.find(l=>l.id===this._currentLang)||{mono:'cpp'}).mono,
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
    el.innerHTML = members.map(m => {
      return `<div class="squad-voice-chip" data-username="${this._esc(m)}">
        <div class="squad-voice-ring"></div>
        <span>${this._esc(m)}</span>
      </div>`;
    }).join('');
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
  async _loadLeaderboardTab() {
    const el = document.getElementById('socialLeaderboardTab');
    if (!el) return;
    el.innerHTML = `<div class="squad-lb-types">
        <button class="squad-lb-pill active" data-type="xp" onclick="App._switchLeaderboardType('xp',this)">⚡ XP</button>
        <button class="squad-lb-pill" data-type="solved" onclick="App._switchLeaderboardType('solved',this)">✔ Solved</button>
        <button class="squad-lb-pill" data-type="streak" onclick="App._switchLeaderboardType('streak',this)">↑ Streak</button>
      </div>
      <div id="lbContent"><div style="padding:20px;color:var(--text-muted);font-family:var(--mono);font-size:12px">// loading...</div></div>`;
    this._renderLeaderboard('xp');
  },

  async _switchLeaderboardType(type, btn) {
    document.querySelectorAll('.squad-lb-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this._renderLeaderboard(type);
  },

  async _renderLeaderboard(type) {
    const el = document.getElementById('lbContent');
    if (!el) return;
    el.innerHTML = '<div style="padding:20px;color:var(--text-muted);font-family:var(--mono);font-size:12px">// loading...</div>';
    const data = await API.getLeaderboard(type, 25);
    const users = data.ok ? (data.leaderboard || data.users || []) : [];
    if (!users.length) {
      el.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted);font-family:var(--mono);font-size:12px">// no data yet</div>';
      return;
    }
    // Normalize score field
    const scoreKey = type === 'streak' ? 'best_streak' : type === 'solved' ? 'total_solved' : 'total_xp';
    const scoreLabel = type === 'xp' ? 'XP' : type === 'solved' ? 'solved' : 'streak';
    const mapped = users.map(u => ({ ...u, score: u[scoreKey] || 0 }));

    const top3 = mapped.slice(0, 3);
    const rest = mapped.slice(3);
    const podiumOrder = [1, 0, 2];
    let podiumHtml = `<div class="squad-lb-podium">`;
    const pClass = ['p2', 'p1', 'p3'];
    for (const i of podiumOrder) {
      const u = top3[i];
      if (!u) continue;
      const rank = i + 1;
      const isMe = u.username === this._username;
      podiumHtml += `<div class="squad-podium-slot ${pClass[i]} ${isMe ? 'me' : ''}" onclick="App._viewUserProfile('${this._esc(u.username)}')" style="cursor:pointer">
        <div class="squad-podium-rank">#${rank}</div>
        <div class="squad-podium-avatar">${this._avatarInitials(u.display_name || u.username)}</div>
        <div class="squad-podium-name">${this._esc(u.display_name || u.username)}</div>
        <div class="squad-podium-score">${u.score.toLocaleString()} ${scoreLabel}</div>
      </div>`;
    }
    podiumHtml += `</div>`;

    let tableHtml = `<div class="squad-lb-table">`;
    rest.forEach((u, i) => {
      const rank = i + 4;
      const isMe = u.username === this._username;
      tableHtml += `<div class="squad-lb-row ${isMe ? 'me' : ''}" onclick="App._viewUserProfile('${this._esc(u.username)}')" style="cursor:pointer">
        <div class="squad-lb-rank">${rank}</div>
        <div class="squad-lb-avatar">${this._avatarInitials(u.display_name || u.username)}</div>
        <div class="squad-lb-name">${this._esc(u.display_name || u.username)} ${isMe ? '<span style="color:var(--brand-light);font-size:10px">(you)</span>' : ''}</div>
        <div class="squad-lb-score">${u.score.toLocaleString()}</div>
      </div>`;
    });
    tableHtml += `</div>`;

    el.innerHTML = podiumHtml + tableHtml;
  },

  async _loadFeedTab() {
    const el = document.getElementById('socialFeedTab');
    if (!el) return;
    const data = await API.getFeed(this._username);
    if (!data.ok || !data.feed.length) {
      el.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-muted);font-family:var(--mono);font-size:12px">// no activity yet — add friends and start solving!</div>`;
      return;
    }

    el.innerHTML = `<div class="squad-feed-list">${data.feed.map(item => `
      <div class="squad-feed-item">
        <div class="squad-feed-dot"></div>
        <span class="squad-feed-avatar">${this._avatarInitials(item.display_name || item.username)}</span>
        <div class="squad-feed-body">
          <span class="squad-feed-user">@${this._esc(item.display_name || item.username)}</span>
          <span class="squad-feed-text"> ${this._esc(item.content)}</span>
          ${item.problem_title ? `<div class="squad-feed-problem">▸ ${this._esc(item.problem_title)}</div>` : ''}
        </div>
        <span class="squad-feed-time">${this._timeAgo(item.created_at)}</span>
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
  tcDeckJump(idx) {
    if (idx >= 0 && idx < this._tcDeckData.length) {
      this._tcDeckIdx = idx;
      this._renderTcDeck();
      this.switchBottomTab('testcases');
    }
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
      solveLeft.style.left = '16px'; solveLeft.style.top = '56px';
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
        this._lastRunError = result.verdict === 'CE' ? (result.error || result.results?.[0]?.stderr || 'Compilation error') : (result.results?.find(r => r.stderr)?.stderr || '');
        this._renderRunResults(result, false);
        if (this._debugMode && result.results) {
          const allStderr = result.results.map(r => r.stderr || '').join('\n');
          if (allStderr) this._parseDebugOutput(allStderr);
        }
      } else {
        const result = await API.run(code, '', lang);
        this._lastRunError = result.stderr || '';
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
        // Editor green flash + glow
        if (editorEl) {
          editorEl.classList.remove('editor-running', 'editor-wa', 'flash-wa', 'flash-ac');
          void editorEl.offsetWidth;
          editorEl.classList.add('editor-ac', 'flash-ac');
          setTimeout(() => editorEl.classList.remove('flash-ac'), 900);
        }
        // XP popup and celebrations
        this._showXpPopup(p);
        this._checkNewAchievements(prevAchievements);
        this._updateSidebarPlayer();
        this._fireConfetti();
        if (this._aiBattle) this._completeAiBattle(true);
      } else if (result.verdict && result.verdict !== 'AC') {
        // Wrong answer — HP down, screen shake, red flash
        this._solveCombo = 0;
        this._updateComboHud();
        this._screenShake();
        if (editorEl) {
          editorEl.classList.remove('editor-running', 'editor-ac', 'flash-ac', 'flash-wa');
          void editorEl.offsetWidth;
          editorEl.classList.add('editor-wa', 'flash-wa');
          setTimeout(() => { if (editorEl) editorEl.classList.remove('editor-wa', 'flash-wa'); }, 2000);
        }
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

    // Show verdict banner in results tab for both Run and Submit
    const resDiv = document.getElementById('bottomResultsContent');
    const passed = result.results ? result.results.filter(r => r.verdict === 'AC').length : 0;
    const total = result.results ? result.results.length : 0;
    const maxTime = result.results?.length ? Math.max(...result.results.map(r => r.timeMs || 0)) : 0;

    if (isSubmit) {
      resDiv.innerHTML = `<div style="padding:10px"><div class="verdict-banner ${v.toLowerCase()}"><i class="icon-${iconName}" style="font-size:18px"></i> ${label}</div></div>`;
      if (v === 'AC') this.switchBottomTab('results');
    } else if (result.results && result.results.length) {
      // Run mode: show quick-check summary banner with test case dots
      const dotsHtml = result.results.map((r, i) => {
        const cls = r.verdict === 'AC' ? 'tc-dot-pass' : 'tc-dot-fail';
        return `<button class="tc-dot ${cls}" onclick="App.tcDeckJump(${i})" title="TC ${i+1}: ${r.verdict}">${i+1}</button>`;
      }).join('');

      const summaryClass = v === 'AC' ? 'ac' : v === 'TLE' ? 'tle' : v === 'WA' ? 'wa' : 're';
      const summaryIcon = v === 'AC' ? 'circle-check' : v === 'TLE' ? 'clock' : 'circle-x';
      const summaryLabel = v === 'AC' ? 'All Tests Passed' : `${passed}/${total} Tests Passed`;

      resDiv.innerHTML = `<div class="run-check-summary">
        <div class="run-check-banner ${summaryClass}">
          <i class="icon-${summaryIcon}" style="font-size:16px"></i>
          <span class="run-check-label">${summaryLabel}</span>
          <span class="run-check-time">${maxTime}ms</span>
        </div>
        <div class="run-check-dots">${dotsHtml}</div>
      </div>`;
      this.switchBottomTab('results');
    }
  },

  resetCode() {
    if (this.editor) this.editor.setValue(this._defaultCode());
  },

  _copyCode() {
    if (!this.editor) return;
    const code = this.editor.getValue();
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('copyCodeBtn');
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="icon-check"></i>';
        btn.style.color = 'var(--success)';
        setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 1500);
      }
      this.toast('Code copied to clipboard', 'success', 2000);
    }).catch(() => this.toast('Copy failed — try manual select', 'error'));
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
      const data = await API.getStats(this._username);
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
    // Add description if available
    const descEl = document.getElementById('achievePopupDesc');
    if (descEl) descEl.textContent = achievement.description || '';
    popup.classList.remove('hidden');
    // Click to dismiss
    popup.onclick = () => {
      popup.classList.add('hidden');
      clearTimeout(popup._timer);
    };
    clearTimeout(popup._timer);
    popup._timer = setTimeout(() => popup.classList.add('hidden'), 4000);
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
      status.textContent = `CF+CC done. Fetching AtCoder...`;
      const ac = await API.sync('atcoder');
      status.textContent = `+AtCoder. Fetching LeetCode...`;
      const lc = await API.sync('leetcode');
      status.textContent = `+LeetCode. Fetching SPOJ...`;
      const sp = await API.sync('spoj');
      status.textContent = `+SPOJ. Fetching Project Euler...`;
      const pe = await API.sync('euler');
      status.textContent = `Done! Total: ${pe.total} problems`;
      this.toast(`Synced! Total missions: ${pe.total}`, 'success');
    } catch (e) {
      status.textContent = 'Sync error';
      this.toast('Sync failed: ' + e.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="icon-sync"></i> Sync All Problems';
  },

  async exportData() {
    try {
      const [stats, settings] = await Promise.all([API.getStats(this._username), API.getSettings()]);
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
      let rafId = 0;
      const onMove = mv => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          panel.style.left = (initLeft + mv.clientX - startX) + 'px';
          panel.style.top  = (initTop  + mv.clientY - startY) + 'px';
        });
      };
      const onUp = () => {
        cancelAnimationFrame(rafId);
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
        let rafId = 0;

        const onMove = mv => {
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
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
          });
        };

        const onUp = () => {
          cancelAnimationFrame(rafId);
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
    const inInput = e.target.closest('input, textarea, [contenteditable]');
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
    // Run: Cmd/Ctrl + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!document.getElementById('solveOverlay').classList.contains('hidden')) this.runCode();
      return;
    }
    // Number navigation: Cmd/Ctrl + 1-9
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      const pages = ['dashboard', 'problems', 'nexus', 'ailab', 'learn', 'forge', 'workshop', 'social'];
      const idx = parseInt(e.key) - 1;
      if (pages[idx]) {
        e.preventDefault();
        location.hash = '#/' + pages[idx];
      }
      return;
    }
    // Ctrl+B / Cmd+B — random problem (battle shortcut)
    if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
      if (!inInput) { e.preventDefault(); this._randomProblem(); }
      return;
    }
    // Ctrl+/ or Cmd+/ — toggle comment (only in editor, else open shortcuts)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      if (!document.getElementById('solveOverlay').classList.contains('hidden')) return; // Monaco handles it
      e.preventDefault();
      this.openShortcuts();
      return;
    }
    if (e.key === 'Escape') {
      // Close in priority order
      if (!document.getElementById('cmdPalette').classList.contains('hidden')) { this.closeCmdPalette(); return; }
      if (!document.getElementById('shortcutsOverlay').classList.contains('hidden')) { this.closeShortcuts(); return; }
      if (!document.getElementById('settingsOverlay')?.classList.contains('hidden')) { this.closeSettings(); return; }
      if (!document.getElementById('ailabSolveOverlay').classList.contains('hidden')) { this._closeAilabSolve(); return; }
      if (!document.getElementById('solveOverlay').classList.contains('hidden')) this.closeSolve();
    }
    // ? key for shortcuts (only when not typing in input)
    if (e.key === '?' && !inInput && !e.ctrlKey && !e.metaKey) {
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
    const sec = Math.floor(diff / 1000);
    if (sec < 10) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  },

  /* ═══════════════════════════════════════════════════
     AUTOCOMPLETE — Language-aware completion providers
     ═══════════════════════════════════════════════════ */
  _registerAutocomplete() {
    const CK = monaco.languages.CompletionItemKind;

    // ── keyword + snippet definitions per language ──
    const langData = {
      cpp: {
        keywords: ['auto','break','case','catch','class','const','constexpr','continue','default','delete','do','double','else','enum','explicit','extern','false','float','for','friend','goto','if','inline','int','long','mutable','namespace','new','noexcept','nullptr','operator','override','private','protected','public','register','return','short','signed','sizeof','static','static_assert','static_cast','struct','switch','template','this','throw','true','try','typedef','typeid','typename','union','unsigned','using','virtual','void','volatile','while','char','bool','wchar_t','int8_t','int16_t','int32_t','int64_t','uint8_t','uint16_t','uint32_t','uint64_t','size_t','string','vector','map','set','unordered_map','unordered_set','pair','queue','stack','deque','priority_queue','array','tuple','bitset','list','multiset','multimap','endl','cin','cout','cerr'],
        snippets: [
          { label: 'for loop', insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}', doc: 'For loop with counter' },
          { label: 'for range', insert: 'for (auto& ${1:x} : ${2:container}) {\n\t$0\n}', doc: 'Range-based for loop' },
          { label: 'while', insert: 'while (${1:condition}) {\n\t$0\n}', doc: 'While loop' },
          { label: 'if else', insert: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', doc: 'If-else block' },
          { label: 'sort', insert: 'sort(${1:v}.begin(), ${1:v}.end());', doc: 'Sort container' },
          { label: 'vector<int>', insert: 'vector<int> ${1:v}(${2:n});', doc: 'Declare vector' },
          { label: 'map<int,int>', insert: 'map<int, int> ${1:mp};', doc: 'Declare map' },
          { label: 'pair<int,int>', insert: 'pair<int, int> ${1:p} = {${2:a}, ${3:b}};', doc: 'Declare pair' },
          { label: 'lambda', insert: 'auto ${1:fn} = [&](${2:int x}) {\n\t$0\n};', doc: 'Lambda expression' },
          { label: 'bits/stdc++', insert: '#include <bits/stdc++.h>\nusing namespace std;\n', doc: 'Competitive programming header' },
          { label: 'fast IO', insert: 'ios_base::sync_with_stdio(false);\ncin.tie(nullptr);', doc: 'Fast IO' },
          { label: 'dfs', insert: 'void dfs(int u, vector<vector<int>>& adj, vector<bool>& vis) {\n\tvis[u] = true;\n\tfor (int v : adj[u]) {\n\t\tif (!vis[v]) dfs(v, adj, vis);\n\t}\n}', doc: 'DFS traversal' },
          { label: 'bfs', insert: 'void bfs(int start, vector<vector<int>>& adj) {\n\tqueue<int> q;\n\tvector<bool> vis(adj.size(), false);\n\tq.push(start);\n\tvis[start] = true;\n\twhile (!q.empty()) {\n\t\tint u = q.front(); q.pop();\n\t\tfor (int v : adj[u]) {\n\t\t\tif (!vis[v]) { vis[v] = true; q.push(v); }\n\t\t}\n\t}\n}', doc: 'BFS traversal' },
          { label: 'binary search', insert: 'int lo = ${1:0}, hi = ${2:n};\nwhile (lo < hi) {\n\tint mid = lo + (hi - lo) / 2;\n\tif (${3:check(mid)}) hi = mid;\n\telse lo = mid + 1;\n}\n// answer = lo', doc: 'Binary search template' },
          { label: 'mod pow', insert: 'long long power(long long base, long long exp, long long mod) {\n\tlong long result = 1;\n\tbase %= mod;\n\twhile (exp > 0) {\n\t\tif (exp & 1) result = result * base % mod;\n\t\tbase = base * base % mod;\n\t\texp >>= 1;\n\t}\n\treturn result;\n}', doc: 'Modular exponentiation' },
        ],
      },
      c: {
        keywords: ['auto','break','case','char','const','continue','default','do','double','else','enum','extern','float','for','goto','if','inline','int','long','register','return','short','signed','sizeof','static','struct','switch','typedef','union','unsigned','void','volatile','while','NULL','FILE','size_t','printf','scanf','malloc','calloc','realloc','free','strlen','strcmp','strcpy','strcat','memset','memcpy'],
        snippets: [
          { label: 'for loop', insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}', doc: 'For loop' },
          { label: 'printf', insert: 'printf("${1:%d}\\n", ${2:var});', doc: 'Formatted print' },
          { label: 'scanf', insert: 'scanf("${1:%d}", &${2:var});', doc: 'Formatted input' },
          { label: 'malloc', insert: '${1:int} *${2:arr} = (${1:int} *)malloc(${3:n} * sizeof(${1:int}));', doc: 'Allocate memory' },
          { label: 'struct', insert: 'struct ${1:Name} {\n\t${2:int val};\n};', doc: 'Struct definition' },
        ],
      },
      python: {
        keywords: ['False','None','True','and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield','print','input','range','len','int','str','float','list','dict','set','tuple','map','filter','sorted','enumerate','zip','min','max','sum','abs','any','all','open','type','isinstance','append','extend','pop','remove','insert','index','count','reverse','sort','keys','values','items','join','split','strip','replace','find','format','upper','lower','startswith','endswith','isdigit','isalpha'],
        snippets: [
          { label: 'for range', insert: 'for ${1:i} in range(${2:n}):\n\t$0', doc: 'For loop with range' },
          { label: 'for enumerate', insert: 'for ${1:i}, ${2:v} in enumerate(${3:arr}):\n\t$0', doc: 'Enumerate loop' },
          { label: 'if else', insert: 'if ${1:condition}:\n\t$2\nelse:\n\t$0', doc: 'If-else' },
          { label: 'def function', insert: 'def ${1:func}(${2:args}):\n\t$0', doc: 'Function definition' },
          { label: 'class', insert: 'class ${1:Name}:\n\tdef __init__(self${2:, args}):\n\t\t$0', doc: 'Class with init' },
          { label: 'try except', insert: 'try:\n\t$1\nexcept ${2:Exception} as ${3:e}:\n\t$0', doc: 'Try-except block' },
          { label: 'list comprehension', insert: '[${1:x} for ${1:x} in ${2:iterable}${3: if condition}]', doc: 'List comprehension' },
          { label: 'lambda', insert: 'lambda ${1:x}: ${2:x}', doc: 'Lambda function' },
          { label: 'defaultdict', insert: 'from collections import defaultdict\n${1:d} = defaultdict(${2:int})', doc: 'Default dictionary' },
          { label: 'Counter', insert: 'from collections import Counter\n${1:c} = Counter(${2:arr})', doc: 'Counter' },
          { label: 'heapq', insert: 'import heapq\nheapq.heappush(${1:heap}, ${2:val})\n${3:val} = heapq.heappop(${1:heap})', doc: 'Heap operations' },
          { label: 'bisect', insert: 'from bisect import bisect_left, bisect_right\n${1:pos} = bisect_left(${2:arr}, ${3:val})', doc: 'Binary search with bisect' },
          { label: 'dfs', insert: 'def dfs(u, adj, vis):\n\tvis.add(u)\n\tfor v in adj[u]:\n\t\tif v not in vis:\n\t\t\tdfs(v, adj, vis)', doc: 'DFS traversal' },
          { label: 'bfs', insert: 'from collections import deque\ndef bfs(start, adj):\n\tq = deque([start])\n\tvis = {start}\n\twhile q:\n\t\tu = q.popleft()\n\t\tfor v in adj[u]:\n\t\t\tif v not in vis:\n\t\t\t\tvis.add(v)\n\t\t\t\tq.append(v)', doc: 'BFS traversal' },
          { label: 'MOD', insert: 'MOD = 10**9 + 7', doc: 'Modular constant' },
          { label: 'sys stdin', insert: 'import sys\ninput = sys.stdin.readline', doc: 'Fast input' },
        ],
      },
      java: {
        keywords: ['abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do','double','else','enum','extends','final','finally','float','for','goto','if','implements','import','instanceof','int','interface','long','native','new','null','package','private','protected','public','return','short','static','strictfp','super','switch','synchronized','this','throw','throws','transient','try','void','volatile','while','String','Integer','Long','Double','Boolean','ArrayList','HashMap','HashSet','LinkedList','TreeMap','TreeSet','Queue','Stack','PriorityQueue','Arrays','Collections','Scanner','StringBuilder','System','Math'],
        snippets: [
          { label: 'for loop', insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}', doc: 'For loop' },
          { label: 'for each', insert: 'for (${1:var} ${2:item} : ${3:collection}) {\n\t$0\n}', doc: 'Enhanced for loop' },
          { label: 'if else', insert: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', doc: 'If-else' },
          { label: 'try catch', insert: 'try {\n\t$1\n} catch (${2:Exception} ${3:e}) {\n\t$0\n}', doc: 'Try-catch' },
          { label: 'sout', insert: 'System.out.println(${1:});', doc: 'Print line' },
          { label: 'Scanner', insert: 'Scanner sc = new Scanner(System.in);', doc: 'Scanner input' },
          { label: 'ArrayList', insert: 'ArrayList<${1:Integer}> ${2:list} = new ArrayList<>();', doc: 'ArrayList' },
          { label: 'HashMap', insert: 'HashMap<${1:String}, ${2:Integer}> ${3:map} = new HashMap<>();', doc: 'HashMap' },
          { label: 'main', insert: 'public static void main(String[] args) {\n\t$0\n}', doc: 'Main method' },
        ],
      },
      javascript: {
        keywords: ['await','break','case','catch','class','const','continue','debugger','default','delete','do','else','export','extends','finally','for','from','function','if','import','in','instanceof','let','new','null','of','return','super','switch','this','throw','true','false','try','typeof','undefined','var','void','while','with','yield','async','console','log','require','module','exports','process','setTimeout','setInterval','Promise','Array','Object','String','Number','Boolean','Map','Set','JSON','Math','Date','Error','RegExp','Symbol','parseInt','parseFloat','isNaN','isFinite','push','pop','shift','unshift','splice','slice','map','filter','reduce','forEach','find','findIndex','some','every','includes','indexOf','join','split','replace','trim','toLowerCase','toUpperCase','keys','values','entries','assign','freeze','create','stringify','parse','then','catch','finally','resolve','reject','all','race','from','of','flat','flatMap','fill','sort','reverse'],
        snippets: [
          { label: 'arrow function', insert: 'const ${1:fn} = (${2:args}) => {\n\t$0\n};', doc: 'Arrow function' },
          { label: 'async function', insert: 'async function ${1:name}(${2:args}) {\n\t$0\n}', doc: 'Async function' },
          { label: 'for of', insert: 'for (const ${1:item} of ${2:iterable}) {\n\t$0\n}', doc: 'For-of loop' },
          { label: 'try catch', insert: 'try {\n\t$1\n} catch (${2:err}) {\n\t$0\n}', doc: 'Try-catch' },
          { label: 'promise', insert: 'new Promise((resolve, reject) => {\n\t$0\n});', doc: 'Promise' },
          { label: 'destructure', insert: 'const { ${1:a}, ${2:b} } = ${3:obj};', doc: 'Object destructuring' },
          { label: 'map', insert: '${1:arr}.map(${2:item} => ${3:item});', doc: 'Array map' },
          { label: 'filter', insert: '${1:arr}.filter(${2:item} => ${3:condition});', doc: 'Array filter' },
          { label: 'reduce', insert: '${1:arr}.reduce((${2:acc}, ${3:cur}) => {\n\t$0\n}, ${4:initial});', doc: 'Array reduce' },
          { label: 'readline', insert: "const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on('line', l => lines.push(l));\nrl.on('close', () => {\n\t$0\n});", doc: 'Readline input' },
        ],
      },
      typescript: {
        keywords: ['abstract','any','as','async','await','bigint','boolean','break','case','catch','class','const','continue','debugger','declare','default','delete','do','else','enum','export','extends','false','finally','for','from','function','get','if','implements','import','in','infer','instanceof','interface','is','keyof','let','module','namespace','never','new','null','number','of','package','private','protected','public','readonly','return','set','static','string','super','switch','symbol','this','throw','true','try','type','typeof','undefined','unique','unknown','var','void','while','with','yield'],
        snippets: [
          { label: 'interface', insert: 'interface ${1:Name} {\n\t${2:prop}: ${3:type};\n}', doc: 'Interface' },
          { label: 'type', insert: 'type ${1:Name} = ${2:type};', doc: 'Type alias' },
          { label: 'generic function', insert: 'function ${1:fn}<${2:T}>(${3:arg}: ${2:T}): ${4:void} {\n\t$0\n}', doc: 'Generic function' },
          { label: 'enum', insert: 'enum ${1:Name} {\n\t${2:Value},\n}', doc: 'Enum' },
          { label: 'async function', insert: 'async function ${1:name}(${2:args}): Promise<${3:void}> {\n\t$0\n}', doc: 'Async function' },
        ],
      },
      go: {
        keywords: ['break','case','chan','const','continue','default','defer','else','fallthrough','for','func','go','goto','if','import','interface','map','package','range','return','select','struct','switch','type','var','append','cap','close','complex','copy','delete','imag','len','make','new','panic','print','println','real','recover','nil','true','false','iota','int','int8','int16','int32','int64','uint','uint8','uint16','uint32','uint64','float32','float64','complex64','complex128','byte','rune','string','bool','error','fmt','Println','Printf','Sprintf','Fprintf','Scanf','Sscanf','Errorf','bufio','os','io','strings','strconv','sort','math','sync','context'],
        snippets: [
          { label: 'func', insert: 'func ${1:name}(${2:args}) ${3:returnType} {\n\t$0\n}', doc: 'Function' },
          { label: 'for range', insert: 'for ${1:i}, ${2:v} := range ${3:slice} {\n\t$0\n}', doc: 'For range' },
          { label: 'if err', insert: 'if err != nil {\n\t$0\n}', doc: 'Error check' },
          { label: 'struct', insert: 'type ${1:Name} struct {\n\t${2:field} ${3:type}\n}', doc: 'Struct' },
          { label: 'goroutine', insert: 'go func() {\n\t$0\n}()', doc: 'Goroutine' },
          { label: 'scanner', insert: 'scanner := bufio.NewScanner(os.Stdin)\nfor scanner.Scan() {\n\tline := scanner.Text()\n\t$0\n}', doc: 'Scanner input' },
        ],
      },
      rust: {
        keywords: ['as','async','await','break','const','continue','crate','dyn','else','enum','extern','false','fn','for','if','impl','in','let','loop','match','mod','move','mut','pub','ref','return','self','Self','static','struct','super','trait','true','type','unsafe','use','where','while','Box','Vec','String','Option','Result','Some','None','Ok','Err','HashMap','HashSet','BTreeMap','BTreeSet','VecDeque','BinaryHeap','Rc','Arc','Cell','RefCell','Mutex','println','eprintln','format','vec','todo','unimplemented','unreachable','panic','assert','assert_eq','assert_ne','cfg','derive','allow','warn','deny','test','bench','main','std','io','fs','collections','iter','cmp','mem','fmt','ops','clone','Copy','Clone','Debug','Display','Default','PartialEq','Eq','PartialOrd','Ord','Hash','Send','Sync','Sized','Drop','Fn','FnMut','FnOnce','Iterator','Into','From','TryInto','TryFrom','AsRef','AsMut','Deref','DerefMut','i8','i16','i32','i64','i128','isize','u8','u16','u32','u64','u128','usize','f32','f64','bool','char','str'],
        snippets: [
          { label: 'fn', insert: 'fn ${1:name}(${2:args}) -> ${3:()} {\n\t$0\n}', doc: 'Function' },
          { label: 'let mut', insert: 'let mut ${1:var} = ${2:value};', doc: 'Mutable binding' },
          { label: 'match', insert: 'match ${1:expr} {\n\t${2:pattern} => $3,\n\t_ => $0,\n}', doc: 'Match expression' },
          { label: 'impl', insert: 'impl ${1:Type} {\n\t$0\n}', doc: 'Impl block' },
          { label: 'struct', insert: 'struct ${1:Name} {\n\t${2:field}: ${3:Type},\n}', doc: 'Struct' },
          { label: 'for iter', insert: 'for ${1:item} in ${2:iter} {\n\t$0\n}', doc: 'For-in loop' },
          { label: 'vec!', insert: 'vec![${1:}]', doc: 'Vec macro' },
          { label: 'read input', insert: 'let mut input = String::new();\nstd::io::stdin().read_line(&mut input).unwrap();\nlet input = input.trim();', doc: 'Read line from stdin' },
        ],
      },
      kotlin: {
        keywords: ['abstract','annotation','as','break','by','catch','class','companion','const','constructor','continue','crossinline','data','do','else','enum','false','final','finally','for','fun','get','if','import','in','infix','init','inline','inner','interface','internal','is','it','lateinit','noinline','null','object','open','operator','out','override','package','private','protected','public','reified','return','sealed','set','super','suspend','tailrec','this','throw','true','try','typealias','typeof','val','var','vararg','when','where','while','Any','Boolean','Byte','Char','Double','Float','Int','Long','Nothing','Short','String','Unit','Array','List','Map','Set','MutableList','MutableMap','MutableSet','Pair','Triple','println','readLine','toInt','toLong','toDouble','split','trim','map','filter','forEach','sorted','sortedBy','groupBy','flatMap','fold','reduce','joinToString','listOf','mutableListOf','mapOf','setOf','arrayOf'],
        snippets: [
          { label: 'fun', insert: 'fun ${1:name}(${2:args}): ${3:Unit} {\n\t$0\n}', doc: 'Function' },
          { label: 'for range', insert: 'for (${1:i} in ${2:0} until ${3:n}) {\n\t$0\n}', doc: 'For range' },
          { label: 'when', insert: 'when (${1:expr}) {\n\t${2:value} -> $3\n\telse -> $0\n}', doc: 'When expression' },
          { label: 'data class', insert: 'data class ${1:Name}(val ${2:prop}: ${3:Type})', doc: 'Data class' },
          { label: 'val', insert: 'val ${1:name}: ${2:Type} = ${3:value}', doc: 'Immutable var' },
          { label: 'readLine', insert: 'val ${1:n} = readLine()!!.trim().toInt()', doc: 'Read integer' },
        ],
      },
      ruby: {
        keywords: ['BEGIN','END','alias','and','begin','break','case','class','def','defined?','do','else','elsif','end','ensure','false','for','if','in','module','next','nil','not','or','redo','rescue','retry','return','self','super','then','true','undef','unless','until','when','while','yield','puts','print','gets','chomp','to_i','to_f','to_s','length','size','each','map','select','reject','reduce','inject','sort','sort_by','flatten','compact','uniq','first','last','push','pop','shift','unshift','include?','empty?','nil?','freeze','frozen?','dup','clone','respond_to?','send','method','class','is_a?','kind_of?','require','require_relative','attr_accessor','attr_reader','attr_writer','initialize','new','raise','catch','throw'],
        snippets: [
          { label: 'def', insert: 'def ${1:method}(${2:args})\n\t$0\nend', doc: 'Method definition' },
          { label: 'each', insert: '${1:arr}.each do |${2:item}|\n\t$0\nend', doc: 'Each block' },
          { label: 'class', insert: 'class ${1:Name}\n\tdef initialize(${2:args})\n\t\t$0\n\tend\nend', doc: 'Class' },
          { label: 'if else', insert: 'if ${1:condition}\n\t$2\nelse\n\t$0\nend', doc: 'If-else' },
          { label: 'map', insert: '${1:arr}.map { |${2:item}| ${3:item} }', doc: 'Map' },
        ],
      },
      php: {
        keywords: ['abstract','and','array','as','break','callable','case','catch','class','clone','const','continue','declare','default','die','do','echo','else','elseif','empty','enddeclare','endfor','endforeach','endif','endswitch','endwhile','eval','exit','extends','final','finally','fn','for','foreach','function','global','goto','if','implements','include','include_once','instanceof','insteadof','interface','isset','list','match','namespace','new','null','or','print','private','protected','public','readonly','require','require_once','return','self','static','switch','throw','trait','true','false','try','unset','use','var','while','xor','yield','array_push','array_pop','array_shift','array_unshift','array_merge','sort','rsort','strlen','strpos','substr','str_replace','explode','implode','trim','strtolower','strtoupper','sprintf','printf','count','in_array','array_key_exists','array_map','array_filter','array_reduce','json_encode','json_decode','intval','floatval','is_array','is_string','is_numeric','isset','empty','var_dump','print_r'],
        snippets: [
          { label: 'function', insert: 'function ${1:name}(${2:args}) {\n\t$0\n}', doc: 'Function' },
          { label: 'foreach', insert: 'foreach (${1:$arr} as ${2:$key} => ${3:$val}) {\n\t$0\n}', doc: 'Foreach loop' },
          { label: 'class', insert: 'class ${1:Name} {\n\tpublic function __construct(${2:args}) {\n\t\t$0\n\t}\n}', doc: 'Class' },
          { label: 'if else', insert: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', doc: 'If-else' },
          { label: 'try catch', insert: 'try {\n\t$1\n} catch (${2:Exception} ${3:$e}) {\n\t$0\n}', doc: 'Try-catch' },
        ],
      },
      csharp: {
        keywords: ['abstract','as','base','bool','break','byte','case','catch','char','checked','class','const','continue','decimal','default','delegate','do','double','else','enum','event','explicit','extern','false','finally','fixed','float','for','foreach','goto','if','implicit','in','int','interface','internal','is','lock','long','namespace','new','null','object','operator','out','override','params','private','protected','public','readonly','ref','return','sbyte','sealed','short','sizeof','stackalloc','static','string','struct','switch','this','throw','true','try','typeof','uint','ulong','unchecked','unsafe','ushort','using','var','virtual','void','volatile','while','async','await','dynamic','nameof','when','yield','Console','WriteLine','ReadLine','List','Dictionary','HashSet','Queue','Stack','Array','String','Math','LINQ','Select','Where','OrderBy','GroupBy','ToList','ToArray','Count','Sum','Max','Min','Average','Any','All','First','FirstOrDefault','Contains','Add','Remove','Clear','Sort','Reverse','ForEach'],
        snippets: [
          { label: 'for loop', insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}', doc: 'For loop' },
          { label: 'foreach', insert: 'foreach (var ${1:item} in ${2:collection}) {\n\t$0\n}', doc: 'Foreach' },
          { label: 'Console.WriteLine', insert: 'Console.WriteLine(${1:});', doc: 'Print line' },
          { label: 'class', insert: 'class ${1:Name} {\n\t$0\n}', doc: 'Class' },
          { label: 'try catch', insert: 'try {\n\t$1\n} catch (${2:Exception} ${3:ex}) {\n\t$0\n}', doc: 'Try-catch' },
          { label: 'List<T>', insert: 'var ${1:list} = new List<${2:int}>();', doc: 'List' },
          { label: 'Dictionary', insert: 'var ${1:dict} = new Dictionary<${2:string}, ${3:int}>();', doc: 'Dictionary' },
          { label: 'LINQ', insert: '${1:collection}.Where(${2:x} => ${3:condition}).ToList();', doc: 'LINQ query' },
        ],
      },
      scala: {
        keywords: ['abstract','case','catch','class','def','do','else','extends','false','final','finally','for','forSome','if','implicit','import','lazy','match','new','null','object','override','package','private','protected','return','sealed','super','this','throw','trait','true','try','type','val','var','while','with','yield','println','readLine','toInt','toString','map','flatMap','filter','foreach','foldLeft','foldRight','reduce','sorted','sortBy','mkString','List','Map','Set','Array','Vector','Option','Some','None','Either','Left','Right','Try','Success','Failure','Future','Seq','Iterable','Iterator','Tuple2','Range','Int','Long','Double','Float','Boolean','String','Char','Unit','Any','AnyRef','AnyVal','Nothing','Null'],
        snippets: [
          { label: 'def', insert: 'def ${1:name}(${2:args}): ${3:Unit} = {\n\t$0\n}', doc: 'Method' },
          { label: 'for yield', insert: 'for {\n\t${1:x} <- ${2:xs}\n} yield ${3:x}', doc: 'For comprehension' },
          { label: 'match', insert: '${1:expr} match {\n\tcase ${2:pattern} => $3\n\tcase _ => $0\n}', doc: 'Pattern match' },
          { label: 'case class', insert: 'case class ${1:Name}(${2:field}: ${3:Type})', doc: 'Case class' },
          { label: 'object', insert: 'object ${1:Name} {\n\tdef main(args: Array[String]): Unit = {\n\t\t$0\n\t}\n}', doc: 'Main object' },
        ],
      },
      swift: {
        keywords: ['associatedtype','class','deinit','enum','extension','fileprivate','func','import','init','inout','internal','let','open','operator','private','protocol','public','rethrows','static','struct','subscript','typealias','var','break','case','continue','default','defer','do','else','fallthrough','for','guard','if','in','repeat','return','switch','where','while','as','catch','false','is','nil','self','Self','super','throw','throws','true','try','Any','AnyObject','Array','Bool','Character','Dictionary','Double','Float','Int','Optional','Set','String','UInt','Void','print','readLine','map','filter','reduce','forEach','sorted','contains','count','append','insert','remove','isEmpty','first','last','prefix','suffix','stride','zip','enumerated','compactMap','flatMap'],
        snippets: [
          { label: 'func', insert: 'func ${1:name}(${2:args}) -> ${3:Void} {\n\t$0\n}', doc: 'Function' },
          { label: 'for in', insert: 'for ${1:item} in ${2:collection} {\n\t$0\n}', doc: 'For-in' },
          { label: 'guard', insert: 'guard ${1:condition} else {\n\t$0\n\treturn\n}', doc: 'Guard' },
          { label: 'if let', insert: 'if let ${1:val} = ${2:optional} {\n\t$0\n}', doc: 'Optional binding' },
          { label: 'struct', insert: 'struct ${1:Name} {\n\t$0\n}', doc: 'Struct' },
          { label: 'enum', insert: 'enum ${1:Name} {\n\tcase ${2:value}\n}', doc: 'Enum' },
        ],
      },
      dart: {
        keywords: ['abstract','as','assert','async','await','break','case','catch','class','const','continue','covariant','default','deferred','do','dynamic','else','enum','export','extends','extension','external','factory','false','final','finally','for','Function','get','hide','if','implements','import','in','interface','is','late','library','mixin','new','null','on','operator','part','required','rethrow','return','set','show','static','super','switch','sync','this','throw','true','try','typedef','var','void','while','with','yield','print','int','double','String','bool','List','Map','Set','num','dynamic','Object','Iterable','Future','Stream','Duration','DateTime','RegExp','Error','Exception','stdin','stdout','readLineSync','toString','toInt','split','trim','map','where','forEach','fold','reduce','sort','reversed','contains','length','isEmpty','add','remove','clear','keys','values','entries'],
        snippets: [
          { label: 'void main', insert: 'void main() {\n\t$0\n}', doc: 'Main function' },
          { label: 'for loop', insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}', doc: 'For loop' },
          { label: 'class', insert: 'class ${1:Name} {\n\t$0\n}', doc: 'Class' },
          { label: 'Future', insert: 'Future<${1:void}> ${2:name}() async {\n\t$0\n}', doc: 'Async function' },
          { label: 'if else', insert: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', doc: 'If-else' },
        ],
      },
      perl: {
        keywords: ['my','our','local','sub','return','if','elsif','else','unless','while','until','for','foreach','do','last','next','redo','goto','die','warn','print','say','chomp','chop','push','pop','shift','unshift','splice','reverse','sort','map','grep','join','split','length','substr','index','rindex','sprintf','printf','open','close','read','write','chomp','chop','defined','undef','ref','bless','use','require','package','BEGIN','END','STDIN','STDOUT','STDERR','qw','qq','qr','scalar','wantarray','keys','values','each','exists','delete','tie','untie','eval','die'],
        snippets: [
          { label: 'sub', insert: 'sub ${1:name} {\n\tmy (${2:@args}) = @_;\n\t$0\n}', doc: 'Subroutine' },
          { label: 'foreach', insert: 'foreach my ${1:$item} (${2:@arr}) {\n\t$0\n}', doc: 'Foreach' },
          { label: 'if else', insert: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', doc: 'If-else' },
          { label: 'while readline', insert: 'while (my $line = <STDIN>) {\n\tchomp $line;\n\t$0\n}', doc: 'Read lines' },
        ],
      },
      lua: {
        keywords: ['and','break','do','else','elseif','end','false','for','function','goto','if','in','local','nil','not','or','repeat','return','then','true','until','while','print','io','read','write','string','table','math','os','type','tostring','tonumber','pairs','ipairs','next','select','unpack','rawget','rawset','setmetatable','getmetatable','require','pcall','xpcall','error','assert','coroutine','insert','remove','sort','concat','format','find','gsub','gmatch','match','sub','len','rep','reverse','upper','lower','byte','char','abs','ceil','floor','max','min','sqrt','random','randomseed','huge','pi'],
        snippets: [
          { label: 'function', insert: 'function ${1:name}(${2:args})\n\t$0\nend', doc: 'Function' },
          { label: 'local function', insert: 'local function ${1:name}(${2:args})\n\t$0\nend', doc: 'Local function' },
          { label: 'for numeric', insert: 'for ${1:i} = ${2:1}, ${3:n} do\n\t$0\nend', doc: 'Numeric for' },
          { label: 'for pairs', insert: 'for ${1:k}, ${2:v} in pairs(${3:t}) do\n\t$0\nend', doc: 'For pairs' },
          { label: 'if else', insert: 'if ${1:condition} then\n\t$2\nelse\n\t$0\nend', doc: 'If-else' },
        ],
      },
      shell: {
        keywords: ['if','then','else','elif','fi','case','esac','for','while','until','do','done','in','function','select','time','coproc','echo','printf','read','declare','local','export','readonly','unset','shift','set','test','true','false','break','continue','return','exit','trap','source','eval','exec','wait','kill','cd','pwd','ls','cat','grep','sed','awk','sort','uniq','wc','head','tail','find','xargs','cut','tr','tee','mkdir','rm','cp','mv','chmod','chown','curl','wget','tar','zip','unzip','date','basename','dirname','realpath','mktemp'],
        snippets: [
          { label: 'if then', insert: 'if [[ ${1:condition} ]]; then\n\t$2\nfi', doc: 'If block' },
          { label: 'for loop', insert: 'for ${1:i} in ${2:items}; do\n\t$0\ndone', doc: 'For loop' },
          { label: 'while read', insert: 'while IFS= read -r ${1:line}; do\n\t$0\ndone', doc: 'While read' },
          { label: 'function', insert: '${1:name}() {\n\t$0\n}', doc: 'Function' },
          { label: 'case', insert: 'case "${1:var}" in\n\t${2:pattern})\n\t\t$0\n\t\t;;\nesac', doc: 'Case statement' },
        ],
      },
      r: {
        keywords: ['if','else','for','while','repeat','function','return','in','next','break','TRUE','FALSE','NULL','NA','Inf','NaN','library','require','source','print','cat','paste','paste0','sprintf','c','vector','list','matrix','data.frame','array','factor','seq','rep','length','nrow','ncol','dim','names','colnames','rownames','head','tail','str','summary','class','typeof','is.numeric','is.character','is.logical','as.numeric','as.character','as.integer','which','match','grep','grepl','gsub','sub','nchar','substr','strsplit','toupper','tolower','trimws','sum','mean','median','var','sd','min','max','range','sort','order','rank','table','unique','duplicated','rev','append','apply','sapply','lapply','tapply','mapply','do.call','Reduce','Filter','Map','ifelse','switch','tryCatch','stop','warning','message','readline','readLines','scan','read.csv','write.csv','file','sink','cat','format','round','ceiling','floor','abs','sqrt','log','log2','log10','exp','cumsum','cumprod','diff','which.min','which.max','sample','set.seed','runif','rnorm','plot','hist','barplot','boxplot','pie','lines','points','abline','legend','title','text','par','pdf','png','dev.off','install.packages','library','require','setwd','getwd','list.files','file.exists','Sys.time','proc.time','system.time'],
        snippets: [
          { label: 'function', insert: '${1:name} <- function(${2:args}) {\n\t$0\n}', doc: 'Function' },
          { label: 'for loop', insert: 'for (${1:i} in ${2:1:n}) {\n\t$0\n}', doc: 'For loop' },
          { label: 'if else', insert: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', doc: 'If-else' },
          { label: 'sapply', insert: 'sapply(${1:X}, function(${2:x}) {\n\t$0\n})', doc: 'sapply' },
          { label: 'tryCatch', insert: 'tryCatch({\n\t$1\n}, error = function(e) {\n\t$0\n})', doc: 'Try-catch' },
        ],
      },
      powershell: {
        keywords: ['if','else','elseif','switch','for','foreach','while','do','until','break','continue','return','function','param','begin','process','end','try','catch','finally','throw','trap','exit','Write-Host','Write-Output','Write-Error','Write-Warning','Write-Verbose','Read-Host','Get-Content','Set-Content','Add-Content','Get-ChildItem','Get-Item','New-Item','Remove-Item','Copy-Item','Move-Item','Test-Path','Join-Path','Split-Path','Resolve-Path','Import-Module','Export-ModuleMember','Get-Command','Invoke-Expression','Invoke-Command','ForEach-Object','Where-Object','Select-Object','Sort-Object','Group-Object','Measure-Object','Compare-Object','New-Object','Get-Member','Format-Table','Format-List','Out-File','Out-String','ConvertTo-Json','ConvertFrom-Json','Get-Process','Stop-Process','Start-Process','Get-Service','Get-Date','Start-Sleep','$true','$false','$null','$_','$PSItem','$args','$input','$Error','$Host','$HOME','$PWD'],
        snippets: [
          { label: 'function', insert: 'function ${1:Name} {\n\tparam(\n\t\t$2\n\t)\n\t$0\n}', doc: 'Function' },
          { label: 'foreach', insert: 'foreach ($$${1:item} in $$${2:collection}) {\n\t$0\n}', doc: 'Foreach loop' },
          { label: 'try catch', insert: 'try {\n\t$1\n} catch {\n\t$0\n}', doc: 'Try-catch' },
          { label: 'if else', insert: 'if ($$${1:condition}) {\n\t$2\n} else {\n\t$0\n}', doc: 'If-else' },
        ],
      },
      julia: {
        keywords: ['function','end','if','else','elseif','for','while','begin','let','do','try','catch','finally','return','break','continue','module','using','import','export','struct','mutable','abstract','primitive','type','const','local','global','macro','quote','true','false','nothing','missing','Inf','NaN','println','print','string','length','size','eltype','typeof','isa','convert','parse','collect','push!','pop!','append!','insert!','deleteat!','sort','sort!','reverse','reverse!','filter','map','reduce','foldl','foldr','zip','enumerate','eachindex','range','zeros','ones','fill','rand','randn','reshape','sum','prod','maximum','minimum','mean','abs','sqrt','log','exp','sin','cos','floor','ceil','round','div','mod','rem','gcd','lcm','isprime','factorial','binomial','Array','Vector','Matrix','Dict','Set','Tuple','String','Symbol','Int','Float64','Bool','Char','Any','Union','Nothing','open','close','read','readline','readlines','write','IOBuffer','stdin','stdout','stderr','@show','@assert','@time','@elapsed','@warn','@error','@info'],
        snippets: [
          { label: 'function', insert: 'function ${1:name}(${2:args})\n\t$0\nend', doc: 'Function' },
          { label: 'for loop', insert: 'for ${1:i} in ${2:1:n}\n\t$0\nend', doc: 'For loop' },
          { label: 'if else', insert: 'if ${1:condition}\n\t$2\nelse\n\t$0\nend', doc: 'If-else' },
          { label: 'struct', insert: 'struct ${1:Name}\n\t${2:field}::${3:Type}\nend', doc: 'Struct' },
          { label: 'try catch', insert: 'try\n\t$1\ncatch ${2:e}\n\t$0\nend', doc: 'Try-catch' },
        ],
      },
      fsharp: {
        keywords: ['let','in','if','then','else','elif','match','with','for','while','do','done','fun','function','rec','mutable','type','of','module','namespace','open','begin','end','class','interface','inherit','abstract','override','member','static','val','new','as','true','false','null','not','and','or','yield','return','async','task','use','try','finally','raise','failwith','printfn','printf','sprintf','List','Array','Seq','Map','Set','Option','Result','Some','None','Ok','Error','string','int','float','bool','unit','obj','ignore','fst','snd','List.map','List.filter','List.fold','List.iter','List.head','List.tail','List.length','Array.map','Array.filter','Array.fold','Array.init','Array.create','Seq.map','Seq.filter','Seq.fold','Seq.iter','Seq.toList','Seq.toArray','Map.ofList','Map.find','Map.tryFind','Map.add','Set.ofList','Set.contains','Set.add','pipe','compose','id','defaultArg'],
        snippets: [
          { label: 'let binding', insert: 'let ${1:name} = $0', doc: 'Let binding' },
          { label: 'function', insert: 'let ${1:name} ${2:args} =\n\t$0', doc: 'Function' },
          { label: 'match', insert: 'match ${1:expr} with\n| ${2:pattern} -> $0', doc: 'Pattern match' },
          { label: 'pipeline', insert: '|> ${1:fn}', doc: 'Pipeline operator' },
          { label: 'async', insert: 'async {\n\t$0\n}', doc: 'Async block' },
        ],
      },
      clojure: {
        keywords: ['def','defn','defn-','defmacro','let','fn','if','do','when','when-not','cond','case','loop','recur','for','doseq','dotimes','while','and','or','not','nil','true','false','ns','require','use','import','refer','in-ns','atom','deref','swap!','reset!','ref','dosync','alter','commute','agent','send','send-off','promise','deliver','future','realized?','map','filter','reduce','apply','partial','comp','complement','juxt','identity','constantly','memoize','assoc','dissoc','get','get-in','assoc-in','update','update-in','select-keys','merge','keys','vals','contains?','empty?','seq','first','rest','next','cons','conj','into','concat','flatten','distinct','sort','sort-by','reverse','take','drop','take-while','drop-while','partition','partition-by','group-by','frequencies','interleave','interpose','zipmap','str','subs','clojure.string/join','clojure.string/split','clojure.string/replace','clojure.string/trim','clojure.string/upper-case','clojure.string/lower-case','println','print','prn','pr-str','format','read-string','slurp','spit','count','range','repeat','repeatedly','iterate','inc','dec','pos?','neg?','zero?','even?','odd?','number?','string?','keyword?','symbol?','vector?','map?','list?','set?','nil?','some?','type','class','instance?','Integer/parseInt','Long/parseLong','Double/parseDouble','Math/pow','Math/sqrt','Math/abs','rand','rand-int','rand-nth','shuffle','try','catch','finally','throw','ex-info','ex-data','ex-message'],
        snippets: [
          { label: 'defn', insert: '(defn ${1:name}\n  [${2:args}]\n  $0)', doc: 'Define function' },
          { label: 'let', insert: '(let [${1:bindings}]\n  $0)', doc: 'Let binding' },
          { label: 'if', insert: '(if ${1:cond}\n  ${2:then}\n  $0)', doc: 'If expression' },
          { label: 'cond', insert: '(cond\n  ${1:test1} ${2:expr1}\n  :else $0)', doc: 'Cond' },
          { label: 'loop recur', insert: '(loop [${1:bindings}]\n  $0\n  (recur ${2:args}))', doc: 'Loop-recur' },
        ],
      },
      scheme: {
        keywords: ['define','lambda','let','let*','letrec','if','cond','case','else','begin','and','or','not','set!','quote','quasiquote','unquote','cons','car','cdr','cadr','caddr','caar','cdar','list','pair?','null?','list?','eq?','eqv?','equal?','number?','string?','symbol?','boolean?','char?','vector?','procedure?','zero?','positive?','negative?','even?','odd?','display','newline','write','read','string-append','string-length','string-ref','substring','string->number','number->string','string->list','list->string','string-upcase','string-downcase','char->integer','integer->char','map','for-each','filter','fold-left','fold-right','apply','append','reverse','length','sort','assoc','assv','assq','member','memv','memq','make-vector','vector','vector-ref','vector-set!','vector-length','vector->list','list->vector','+','-','*','/','=','<','>','<=','>=','remainder','quotient','modulo','abs','max','min','gcd','lcm','floor','ceiling','round','truncate','exact->inexact','inexact->exact','sqrt','expt','log','exp','sin','cos','tan','asin','acos','atan','random','values','call-with-values','call-with-current-continuation','call/cc','dynamic-wind','with-exception-handler','guard','raise','error','open-input-file','open-output-file','close-port','eof-object?','read-char','write-char','read-line','with-input-from-file','with-output-to-file'],
        snippets: [
          { label: 'define function', insert: '(define (${1:name} ${2:args})\n  $0)', doc: 'Define function' },
          { label: 'define variable', insert: '(define ${1:name} $0)', doc: 'Define variable' },
          { label: 'lambda', insert: '(lambda (${1:args})\n  $0)', doc: 'Lambda expression' },
          { label: 'let', insert: '(let ((${1:var} ${2:val}))\n  $0)', doc: 'Let binding' },
          { label: 'cond', insert: '(cond\n  (${1:test1} ${2:expr1})\n  (else $0))', doc: 'Cond expression' },
        ],
      },
      'objective-c': {
        keywords: ['@interface','@implementation','@end','@protocol','@property','@synthesize','@dynamic','@class','@selector','@encode','@try','@catch','@finally','@throw','@autoreleasepool','@synchronized','@required','@optional','@public','@private','@protected','@package','self','super','nil','Nil','YES','NO','TRUE','FALSE','id','Class','SEL','IMP','BOOL','void','int','float','double','long','short','char','unsigned','signed','const','static','extern','register','volatile','typedef','struct','union','enum','if','else','for','while','do','switch','case','default','break','continue','return','goto','sizeof','NSObject','NSString','NSMutableString','NSArray','NSMutableArray','NSDictionary','NSMutableDictionary','NSSet','NSMutableSet','NSNumber','NSInteger','NSUInteger','CGFloat','NSLog','NSError','NSURL','NSDate','NSData','NSNotificationCenter','NSUserDefaults','dispatch_async','dispatch_sync','dispatch_queue_t','alloc','init','new','copy','mutableCopy','retain','release','autorelease','dealloc','description','isEqual','hash','class','superclass','respondsToSelector','performSelector','conformsToProtocol','isKindOfClass','isMemberOfClass','stringWithFormat','arrayWithObjects','dictionaryWithObjectsAndKeys','initWithFrame','addSubview','removeFromSuperview','setNeedsLayout','layoutSubviews','drawRect','viewDidLoad','viewWillAppear','viewDidAppear'],
        snippets: [
          { label: '@interface', insert: '@interface ${1:ClassName} : ${2:NSObject}\n$0\n@end', doc: 'Interface declaration' },
          { label: '@implementation', insert: '@implementation ${1:ClassName}\n$0\n@end', doc: 'Implementation' },
          { label: 'method', insert: '- (${1:void})${2:methodName} {\n\t$0\n}', doc: 'Instance method' },
          { label: 'property', insert: '@property (nonatomic, ${1:strong}) ${2:NSString} *${3:name};', doc: 'Property' },
          { label: 'NSLog', insert: 'NSLog(@"${1:%@}", ${2:obj});', doc: 'NSLog' },
        ],
      },
      sql: {
        keywords: ['SELECT','FROM','WHERE','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','ALTER','DROP','INDEX','VIEW','TRIGGER','PROCEDURE','FUNCTION','DATABASE','SCHEMA','IF','EXISTS','NOT','NULL','DEFAULT','PRIMARY','KEY','FOREIGN','REFERENCES','UNIQUE','CHECK','CONSTRAINT','AUTO_INCREMENT','IDENTITY','SERIAL','AND','OR','IN','BETWEEN','LIKE','ILIKE','IS','AS','ON','JOIN','INNER','LEFT','RIGHT','FULL','OUTER','CROSS','NATURAL','USING','UNION','ALL','INTERSECT','EXCEPT','ORDER','BY','ASC','DESC','LIMIT','OFFSET','FETCH','FIRST','NEXT','ROWS','ONLY','GROUP','HAVING','DISTINCT','COUNT','SUM','AVG','MIN','MAX','CASE','WHEN','THEN','ELSE','END','CAST','CONVERT','COALESCE','NULLIF','IFNULL','NVL','DECODE','SUBSTRING','TRIM','UPPER','LOWER','LENGTH','REPLACE','CONCAT','ROUND','FLOOR','CEIL','ABS','MOD','POWER','SQRT','NOW','CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP','DATE','TIME','YEAR','MONTH','DAY','HOUR','MINUTE','SECOND','EXTRACT','DATEADD','DATEDIFF','TO_CHAR','TO_DATE','TO_NUMBER','GRANT','REVOKE','COMMIT','ROLLBACK','SAVEPOINT','BEGIN','TRANSACTION','DECLARE','CURSOR','OPEN','CLOSE','FETCH','INTO','LOOP','WHILE','FOR','EXIT','RETURN','RAISE','EXCEPTION','VARCHAR','CHAR','INT','INTEGER','BIGINT','SMALLINT','DECIMAL','NUMERIC','FLOAT','DOUBLE','REAL','BOOLEAN','TEXT','BLOB','CLOB','DATE','TIMESTAMP','INTERVAL','JSON','JSONB','XML','ARRAY','ENUM','MONEY'],
        snippets: [
          { label: 'SELECT', insert: 'SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:condition};', doc: 'SELECT query' },
          { label: 'INSERT', insert: 'INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});', doc: 'INSERT statement' },
          { label: 'UPDATE', insert: 'UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};', doc: 'UPDATE statement' },
          { label: 'CREATE TABLE', insert: 'CREATE TABLE ${1:name} (\n\t${2:id} INT PRIMARY KEY,\n\t${3:col} VARCHAR(255)$0\n);', doc: 'Create table' },
          { label: 'JOIN', insert: 'SELECT ${1:cols}\nFROM ${2:t1}\nJOIN ${3:t2} ON ${2:t1}.${4:id} = ${3:t2}.${5:fk};', doc: 'JOIN query' },
        ],
      },
      pgsql: {
        keywords: ['SELECT','FROM','WHERE','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','ALTER','DROP','INDEX','VIEW','TRIGGER','FUNCTION','PROCEDURE','DATABASE','SCHEMA','IF','EXISTS','NOT','NULL','DEFAULT','PRIMARY','KEY','FOREIGN','REFERENCES','UNIQUE','CHECK','CONSTRAINT','SERIAL','BIGSERIAL','SMALLSERIAL','AND','OR','IN','BETWEEN','LIKE','ILIKE','SIMILAR','IS','AS','ON','JOIN','INNER','LEFT','RIGHT','FULL','OUTER','CROSS','LATERAL','NATURAL','USING','UNION','ALL','INTERSECT','EXCEPT','ORDER','BY','ASC','DESC','NULLS','FIRST','LAST','LIMIT','OFFSET','FETCH','NEXT','ROWS','ONLY','GROUP','HAVING','DISTINCT','COUNT','SUM','AVG','MIN','MAX','CASE','WHEN','THEN','ELSE','END','CAST','COALESCE','NULLIF','GREATEST','LEAST','ARRAY','ARRAY_AGG','STRING_AGG','JSON_AGG','JSONB_AGG','JSON_BUILD_OBJECT','JSONB_BUILD_OBJECT','ROW_NUMBER','RANK','DENSE_RANK','LAG','LEAD','FIRST_VALUE','LAST_VALUE','NTH_VALUE','NTILE','PARTITION','OVER','WINDOW','FILTER','WITHIN','GROUP','RETURNING','ON CONFLICT','DO NOTHING','DO UPDATE','UPSERT','CTE','WITH','RECURSIVE','MATERIALIZED','EXPLAIN','ANALYZE','VACUUM','REINDEX','CLUSTER','COPY','PERFORM','RAISE','NOTICE','EXCEPTION','INFO','WARNING','DEBUG','LOG','EXECUTE','FORMAT','FOUND','NEW','OLD','TG_OP','TG_TABLE_NAME','TG_WHEN','RETURNS','LANGUAGE','PLPGSQL','VOLATILE','STABLE','IMMUTABLE','SECURITY','DEFINER','INVOKER','TEXT','INTEGER','BIGINT','SMALLINT','BOOLEAN','NUMERIC','DECIMAL','REAL','DOUBLE PRECISION','VARCHAR','CHAR','DATE','TIME','TIMESTAMP','TIMESTAMPTZ','INTERVAL','UUID','JSONB','JSON','BYTEA','INET','CIDR','MACADDR','POINT','LINE','BOX','CIRCLE','POLYGON','TSVECTOR','TSQUERY','REGCLASS','OID','MONEY','HSTORE','INT4RANGE','INT8RANGE','NUMRANGE','TSRANGE','TSTZRANGE','DATERANGE','GENERATE_SERIES','NOW','CURRENT_DATE','CURRENT_TIMESTAMP','AGE','DATE_TRUNC','DATE_PART','EXTRACT','TO_CHAR','TO_DATE','TO_TIMESTAMP','TO_NUMBER','PG_SLEEP','CONCAT','CONCAT_WS','SUBSTRING','POSITION','TRIM','UPPER','LOWER','LEFT','RIGHT','LENGTH','REPLACE','REGEXP_REPLACE','REGEXP_MATCHES','SPLIT_PART','ENCODE','DECODE','MD5','GEN_RANDOM_UUID','ROUND','FLOOR','CEIL','ABS','MOD','POWER','SQRT','LN','LOG','RANDOM','SETSEED','GREATEST','LEAST'],
        snippets: [
          { label: 'CREATE FUNCTION', insert: 'CREATE OR REPLACE FUNCTION ${1:name}(${2:args})\nRETURNS ${3:void} AS $$$$\nBEGIN\n\t$0\nEND;\n$$$$ LANGUAGE plpgsql;', doc: 'PL/pgSQL function' },
          { label: 'SELECT', insert: 'SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:condition};', doc: 'SELECT query' },
          { label: 'CTE', insert: 'WITH ${1:cte_name} AS (\n\t${2:SELECT 1}\n)\nSELECT * FROM ${1:cte_name};', doc: 'Common Table Expression' },
          { label: 'UPSERT', insert: 'INSERT INTO ${1:table} (${2:cols})\nVALUES (${3:vals})\nON CONFLICT (${4:key}) DO UPDATE\nSET ${5:col} = EXCLUDED.${5:col};', doc: 'Upsert' },
        ],
      },
      pascal: {
        keywords: ['program','unit','uses','interface','implementation','initialization','finalization','begin','end','var','const','type','procedure','function','array','of','record','class','object','constructor','destructor','inherited','virtual','override','abstract','private','protected','public','published','property','read','write','default','if','then','else','case','for','to','downto','while','repeat','until','do','with','try','except','finally','raise','on','break','continue','exit','halt','result','nil','true','false','and','or','not','xor','shl','shr','div','mod','in','is','as','integer','longint','int64','byte','word','cardinal','real','double','extended','boolean','char','string','shortstring','ansistring','widestring','pointer','file','text','set','writeln','write','readln','read','inc','dec','length','setlength','low','high','sizeof','ord','chr','succ','pred','abs','sqr','sqrt','round','trunc','random','randomize','copy','pos','delete','insert','concat','upcase','lowercase','trim','val','str','inttostr','strtoint','floattostr','strtofloat','format','assigned','new','dispose','getmem','freemem','move','fillchar','append','close','reset','rewrite','eof','eoln','ioresult','assignfile','closefile'],
        snippets: [
          { label: 'program', insert: 'program ${1:Name};\n\nbegin\n\t$0\nend.', doc: 'Program' },
          { label: 'procedure', insert: 'procedure ${1:Name}(${2:params});\nbegin\n\t$0\nend;', doc: 'Procedure' },
          { label: 'function', insert: 'function ${1:Name}(${2:params}): ${3:integer};\nbegin\n\tResult := $0;\nend;', doc: 'Function' },
          { label: 'for loop', insert: 'for ${1:i} := ${2:0} to ${3:n} do\nbegin\n\t$0\nend;', doc: 'For loop' },
          { label: 'if then else', insert: 'if ${1:condition} then\nbegin\n\t$2\nend\nelse\nbegin\n\t$0\nend;', doc: 'If-then-else' },
        ],
      },
      vb: {
        keywords: ['Module','Sub','Function','End','Dim','As','Integer','Long','String','Boolean','Double','Single','Decimal','Date','Object','Variant','Byte','Short','Char','If','Then','Else','ElseIf','End If','Select','Case','End Select','For','To','Step','Next','For Each','In','Do','While','Loop','Until','Wend','With','End With','Try','Catch','Finally','End Try','Throw','ReDim','Preserve','Erase','Public','Private','Protected','Friend','Shared','Static','Const','ReadOnly','ByVal','ByRef','Optional','ParamArray','Call','Return','Exit','GoTo','Resume','On Error','Class','Structure','Interface','Enum','Namespace','Imports','Module','Property','Get','Set','Let','Event','RaiseEvent','AddHandler','RemoveHandler','Handles','Delegate','New','Me','MyBase','MyClass','Nothing','True','False','Not','And','Or','AndAlso','OrElse','Xor','Mod','Like','Is','IsNot','TypeOf','GetType','CType','CInt','CLng','CDbl','CStr','CBool','CByte','CChar','CDate','CDec','CSng','CShort','CObj','DirectCast','TryCast','Console.Write','Console.WriteLine','Console.ReadLine','MsgBox','InputBox','Len','Mid','Left','Right','UCase','LCase','Trim','LTrim','RTrim','Replace','InStr','Split','Join','Val','CStr','Format','Chr','Asc','Abs','Int','Fix','Sqr','Math.Pow','Math.Sqrt','Math.Abs','Math.Floor','Math.Ceiling','Math.Round','Math.Max','Math.Min','Array.Sort','Array.Reverse','String.Format','String.Join','String.IsNullOrEmpty'],
        snippets: [
          { label: 'Sub', insert: 'Sub ${1:Name}()\n\t$0\nEnd Sub', doc: 'Subroutine' },
          { label: 'Function', insert: 'Function ${1:Name}(${2:params}) As ${3:Integer}\n\t$0\nEnd Function', doc: 'Function' },
          { label: 'If Then', insert: 'If ${1:condition} Then\n\t$2\nElse\n\t$0\nEnd If', doc: 'If-Then-Else' },
          { label: 'For Next', insert: 'For ${1:i} As Integer = ${2:0} To ${3:n}\n\t$0\nNext', doc: 'For loop' },
          { label: 'Try Catch', insert: 'Try\n\t$1\nCatch ex As Exception\n\t$0\nEnd Try', doc: 'Try-Catch' },
        ],
      },
      elixir: {
        keywords: ['def','defp','defmodule','defmacro','defstruct','defprotocol','defimpl','defdelegate','defguard','defexception','defoverridable','do','end','if','else','unless','cond','case','with','when','fn','receive','after','send','spawn','spawn_link','self','raise','reraise','rescue','try','catch','throw','import','require','use','alias','for','in','not','and','or','true','false','nil','is_atom','is_binary','is_bitstring','is_boolean','is_float','is_function','is_integer','is_list','is_map','is_nil','is_number','is_pid','is_reference','is_tuple','abs','ceil','floor','round','trunc','div','rem','max','min','length','hd','tl','elem','put_elem','tuple_size','map_size','is_map_key','Enum.map','Enum.filter','Enum.reduce','Enum.each','Enum.sort','Enum.find','Enum.any?','Enum.all?','Enum.count','Enum.zip','Enum.chunk_every','Enum.flat_map','Enum.join','Enum.into','Enum.member?','Enum.at','Enum.take','Enum.drop','Enum.reverse','Enum.sum','Enum.max','Enum.min','Enum.uniq','Enum.group_by','Enum.frequencies','List.first','List.last','List.flatten','List.zip','Map.get','Map.put','Map.delete','Map.merge','Map.keys','Map.values','Map.has_key?','Map.new','Map.update','String.split','String.join','String.replace','String.trim','String.upcase','String.downcase','String.contains?','String.starts_with?','String.ends_with?','String.length','String.to_integer','String.to_float','Integer.parse','Float.parse','IO.puts','IO.gets','IO.inspect','Kernel.inspect','File.read','File.write','File.exists?','Path.join','Agent.start_link','Agent.get','Agent.update','GenServer','Task.async','Task.await','Supervisor','Application','Logger','dbg'],
        snippets: [
          { label: 'defmodule', insert: 'defmodule ${1:Module} do\n\t$0\nend', doc: 'Module' },
          { label: 'def', insert: 'def ${1:name}(${2:args}) do\n\t$0\nend', doc: 'Function' },
          { label: 'case', insert: 'case ${1:expr} do\n\t${2:pattern} ->\n\t\t$0\nend', doc: 'Case expression' },
          { label: 'pipe', insert: '|> ${1:fn}()', doc: 'Pipe operator' },
          { label: 'with', insert: 'with ${1:pattern} <- ${2:expr} do\n\t$0\nend', doc: 'With expression' },
        ],
      },
      tcl: {
        keywords: ['proc','set','puts','gets','expr','if','elseif','else','for','foreach','while','switch','break','continue','return','uplevel','upvar','global','variable','namespace','package','source','eval','catch','try','throw','error','info','array','list','lindex','lrange','llength','lappend','linsert','lreplace','lsearch','lsort','lmap','concat','join','split','string','regexp','regsub','scan','format','append','incr','dict','open','close','read','gets','puts','flush','eof','seek','tell','file','glob','cd','pwd','exec','pid','after','vwait','update','trace','rename','interp','load','unset','subst','binary','clock','msgcat','http','socket','fileevent','fconfigure','encoding','apply','lassign','lrepeat','lreverse','mathfunc','mathop','chan','coroutine','yield','tailcall','oo::class','oo::define','oo::objdefine','method','constructor','destructor','my','self','next'],
        snippets: [
          { label: 'proc', insert: 'proc ${1:name} {${2:args}} {\n\t$0\n}', doc: 'Procedure' },
          { label: 'if', insert: 'if {${1:condition}} {\n\t$2\n} else {\n\t$0\n}', doc: 'If-else' },
          { label: 'foreach', insert: 'foreach ${1:var} $$${2:list} {\n\t$0\n}', doc: 'Foreach loop' },
          { label: 'while', insert: 'while {${1:condition}} {\n\t$0\n}', doc: 'While loop' },
        ],
      },
      solidity: {
        keywords: ['pragma','solidity','contract','interface','library','abstract','is','constructor','function','modifier','event','emit','error','revert','require','assert','mapping','struct','enum','public','private','internal','external','view','pure','payable','nonpayable','virtual','override','constant','immutable','indexed','anonymous','returns','return','if','else','for','while','do','break','continue','delete','new','this','super','selfdestruct','type','address','bool','string','bytes','bytes1','bytes2','bytes4','bytes8','bytes16','bytes32','uint','uint8','uint16','uint32','uint64','uint128','uint256','int','int8','int16','int32','int64','int128','int256','fixed','ufixed','true','false','wei','gwei','ether','seconds','minutes','hours','days','weeks','msg.sender','msg.value','msg.data','msg.sig','block.timestamp','block.number','block.difficulty','block.gaslimit','block.chainid','block.basefee','tx.origin','tx.gasprice','gasleft','blockhash','keccak256','sha256','ripemd160','ecrecover','addmod','mulmod','abi.encode','abi.encodePacked','abi.encodeWithSelector','abi.encodeWithSignature','abi.decode','memory','storage','calldata','assembly','unchecked','try','catch','using','import','from','as','fallback','receive','transfer','send','call','delegatecall','staticcall','balance','code','codehash','push','pop','length','concat','IERC20','IERC721','ERC20','ERC721','Ownable','ReentrancyGuard','SafeMath','Address','Strings','Counters','Context','AccessControl'],
        snippets: [
          { label: 'contract', insert: 'contract ${1:Name} {\n\t$0\n}', doc: 'Contract' },
          { label: 'function', insert: 'function ${1:name}(${2:params}) ${3:public} ${4:returns (${5:uint256})} {\n\t$0\n}', doc: 'Function' },
          { label: 'modifier', insert: 'modifier ${1:name}() {\n\t$0\n\t_;\n}', doc: 'Modifier' },
          { label: 'event', insert: 'event ${1:Name}(${2:address indexed sender});', doc: 'Event' },
          { label: 'mapping', insert: 'mapping(${1:address} => ${2:uint256}) ${3:public} ${4:name};', doc: 'Mapping' },
          { label: 'require', insert: 'require(${1:condition}, "${2:error message}");', doc: 'Require' },
        ],
      },
    };

    // Helper to build completion items
    const mkItems = (langId) => {
      const data = langData[langId];
      if (!data) return [];
      const items = [];
      // Keywords
      if (data.keywords) {
        for (const kw of data.keywords) {
          items.push({
            label: kw,
            kind: CK.Keyword,
            insertText: kw,
            detail: 'keyword',
            sortText: '1_' + kw,
          });
        }
      }
      // Snippets
      if (data.snippets) {
        for (const sn of data.snippets) {
          items.push({
            label: sn.label,
            kind: CK.Snippet,
            insertText: sn.insert,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: sn.doc,
            detail: 'snippet',
            sortText: '0_' + sn.label,
          });
        }
      }
      return items;
    };

    // Register a completion provider for each language that has data
    const registeredLangs = new Set();
    for (const lang of this._langs) {
      const monacoLang = lang.mono;
      if (registeredLangs.has(monacoLang)) continue;
      registeredLangs.add(monacoLang);

      const items = mkItems(lang.id);
      // Also collect items from languages that share the same Monaco language ID
      const allItems = [...items];
      for (const otherLang of this._langs) {
        if (otherLang.id !== lang.id && otherLang.mono === monacoLang) {
          allItems.push(...mkItems(otherLang.id));
        }
      }
      if (!allItems.length) continue;

      monaco.languages.registerCompletionItemProvider(monacoLang, {
        triggerCharacters: ['.', ':', '<', '(', '{', '[', ' ', '$', '@', '#'],
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          return { suggestions: allItems.map(item => ({ ...item, range })) };
        }
      });
    }

    // ── Inline Completion Provider (ghost text / line prediction) ──
    this._registerInlineCompletions();
  },

  _registerInlineCompletions() {
    // Comprehensive pattern-based inline predictions for all languages
    const patterns = {
      // === C / C++ ===
      cpp: [
        { re: /^\s*#inc$/, text: 'lude <bits/stdc++.h>' },
        { re: /^\s*#include\s*<bits\/stdc\+\+\.h>\s*$/, text: '\nusing namespace std;' },
        { re: /^\s*using\s+namespace\s+std;\s*$/, text: '\n\nint main() {\n\tios_base::sync_with_stdio(false);\n\tcin.tie(NULL);\n\t\n\treturn 0;\n}' },
        { re: /^\s*for\s*\(\s*int\s+(\w+)\s*=\s*0\s*;\s*$/, text: (m) => `${m[1]} < n; ${m[1]}++) {` },
        { re: /^\s*for\s*\(\s*int\s+(\w+)\s*=\s*0\s*;\s*\w+\s*<\s*\w+\s*;\s*\w+\+\+\s*\)\s*\{?\s*$/, text: '\n\t' },
        { re: /^\s*for\s*\($/, text: 'int i = 0; i < n; i++) {' },
        { re: /^\s*for\s*\(auto\s*&?\s*$/, text: (m) => 'x : v) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
        { re: /^\s*while\s*\($/, text: ') {' },
        { re: /^\s*cout\s*<<\s*$/, text: ' << endl;' },
        { re: /^\s*cin\s*>>\s*$/, text: ';' },
        { re: /^\s*vector<int>\s+(\w+)$/, text: (m) => `(n);` },
        { re: /^\s*vector<int>\s+\w+\((\w+)\);\s*$/, text: '\nfor (int i = 0; i < n; i++) cin >> v[i];' },
        { re: /^\s*sort\($/, text: 'v.begin(), v.end());' },
        { re: /^\s*int\s+(\w+)\s*=\s*$/, text: '0;' },
        { re: /^\s*string\s+(\w+)$/, text: ';' },
        { re: /^\s*void\s+(\w+)\s*\($/, text: ') {\n\t\n}' },
        { re: /^\s*int\s+main\s*\(\s*\)\s*\{?\s*$/, text: '\n\tios_base::sync_with_stdio(false);\n\tcin.tie(NULL);\n\t\n\treturn 0;\n}' },
        { re: /^\s*return\s+$/, text: '0;' },
        { re: /^\s*map<$/, text: 'int, int> mp;' },
        { re: /^\s*set<$/, text: 'int> s;' },
        { re: /^\s*priority_queue<$/, text: 'int> pq;' },
        { re: /^\s*queue<$/, text: 'int> q;' },
        { re: /^\s*stack<$/, text: 'int> st;' },
        { re: /^\s*pair<$/, text: 'int, int>' },
        { re: /^\s*long\s+long\s+$/, text: 'n;' },
        { re: /^\s*const\s+int\s+MOD\s*$/, text: '= 1e9 + 7;' },
        { re: /^\s*#define\s+$/, text: 'll long long' },
        { re: /^\s*template\s*<$/, text: 'typename T>' },
      ],
      // === Python ===
      python: [
        { re: /^\s*def\s+(\w+)\s*\($/, text: (m) => '):' },
        { re: /^\s*def\s+(\w+)\s*\(.*\)\s*:?\s*$/, text: '\n\t' },
        { re: /^\s*class\s+(\w+)$/, text: ':\n\tdef __init__(self):\n\t\t' },
        { re: /^\s*class\s+(\w+)\s*:?\s*$/, text: '\n\tdef __init__(self):\n\t\t' },
        { re: /^\s*for\s+(\w+)\s+in\s*$/, text: 'range(n):' },
        { re: /^\s*for\s+(\w+)\s+in\s+range\(\w+\)\s*:\s*$/, text: '\n\t' },
        { re: /^\s*if\s+$/, text: ':' },
        { re: /^\s*if\s+.*:\s*$/, text: '\n\t' },
        { re: /^\s*elif\s+$/, text: ':' },
        { re: /^\s*else\s*$/, text: ':' },
        { re: /^\s*while\s+$/, text: ':' },
        { re: /^\s*try\s*$/, text: ':' },
        { re: /^\s*try\s*:\s*$/, text: '\n\t' },
        { re: /^\s*except\s*$/, text: ' Exception as e:' },
        { re: /^\s*with\s+open\s*\($/, text: "'file.txt', 'r') as f:" },
        { re: /^\s*import\s*$/, text: 'sys' },
        { re: /^\s*from\s+collections\s+import\s*$/, text: 'defaultdict, Counter, deque' },
        { re: /^\s*from\s+functools\s+import\s*$/, text: 'lru_cache' },
        { re: /^\s*from\s+itertools\s+import\s*$/, text: 'permutations, combinations' },
        { re: /^\s*from\s+bisect\s+import\s*$/, text: 'bisect_left, bisect_right' },
        { re: /^\s*from\s+heapq\s+import\s*$/, text: 'heappush, heappop' },
        { re: /^\s*n\s*=\s*int\s*\($/, text: "input())" },
        { re: /^\s*n\s*=\s*int\(input\(\)\)\s*$/, text: '' },
        { re: /^\s*(\w+)\s*=\s*list\s*\($/, text: "map(int, input().split()))" },
        { re: /^\s*(\w+)\s*=\s*\[\s*$/, text: ']' },
        { re: /^\s*print\s*\($/, text: ')' },
        { re: /^\s*input\s*\($/, text: ').split()' },
        { re: /^\s*(\w+)\.append\s*\($/, text: ')' },
        { re: /^\s*return\s*$/, text: '' },
        { re: /^\s*lambda\s+$/, text: 'x: x' },
        { re: /^\s*sys\.stdin$/, text: '.readline' },
        { re: /^\s*@lru_cache$/, text: '(maxsize=None)' },
        { re: /^\s*def\s+solve\s*\(\s*\)\s*:\s*$/, text: '\n\t' },
        { re: /^\s*t\s*=\s*int\(input\(\)\)\s*$/, text: '\nfor _ in range(t):\n\tsolve()' },
      ],
      // === Java ===
      java: [
        { re: /^\s*public\s+class\s+(\w+)\s*\{?\s*$/, text: '\n\tpublic static void main(String[] args) {\n\t\tScanner sc = new Scanner(System.in);\n\t\t\n\t}\n}' },
        { re: /^\s*public\s+static\s+void\s+main\s*\($/, text: 'String[] args) {' },
        { re: /^\s*Scanner\s+(\w+)\s*=\s*new\s*$/, text: 'Scanner(System.in);' },
        { re: /^\s*System\.out\.print$/, text: 'ln();' },
        { re: /^\s*for\s*\(int\s+(\w+)\s*=\s*0\s*;\s*$/, text: (m) => `${m[1]} < n; ${m[1]}++) {` },
        { re: /^\s*for\s*\($/, text: 'int i = 0; i < n; i++) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
        { re: /^\s*while\s*\($/, text: ') {' },
        { re: /^\s*import\s+java\.$/, text: 'util.*;' },
        { re: /^\s*import\s+java\.util\.\*;\s*$/, text: '\nimport java.io.*;' },
        { re: /^\s*int\[\]\s+(\w+)\s*=\s*new\s*$/, text: (m) => `int[n];` },
        { re: /^\s*String\s+(\w+)\s*=\s*$/, text: 'sc.next();' },
        { re: /^\s*int\s+(\w+)\s*=\s*$/, text: 'sc.nextInt();' },
        { re: /^\s*ArrayList<$/, text: 'Integer> list = new ArrayList<>();' },
        { re: /^\s*HashMap<$/, text: 'Integer, Integer> map = new HashMap<>();' },
        { re: /^\s*private\s+$/, text: 'static ' },
        { re: /^\s*return\s+$/, text: ';' },
      ],
      // === JavaScript ===
      javascript: [
        { re: /^\s*const\s+(\w+)\s*=\s*\($/, text: ') => {' },
        { re: /^\s*const\s+(\w+)\s*=\s*$/, text: ';' },
        { re: /^\s*let\s+(\w+)\s*=\s*$/, text: ';' },
        { re: /^\s*function\s+(\w+)\s*\($/, text: ') {' },
        { re: /^\s*for\s*\(let\s+(\w+)\s*=\s*0\s*;\s*$/, text: (m) => `${m[1]} < n; ${m[1]}++) {` },
        { re: /^\s*for\s*\(const\s+(\w+)\s+of\s*$/, text: 'arr) {' },
        { re: /^\s*for\s*\($/, text: 'let i = 0; i < n; i++) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
        { re: /^\s*while\s*\($/, text: ') {' },
        { re: /^\s*console\.log\s*\($/, text: ');' },
        { re: /^\s*return\s+$/, text: ';' },
        { re: /^\s*const\s+readline\s*$/, text: "= require('readline');" },
        { re: /^\s*process\.stdin$/, text: ".on('data', d => {" },
        { re: /^\s*\.map\s*\($/, text: (m) => 'Number);' },
        { re: /^\s*\.filter\s*\($/, text: 'x => );' },
        { re: /^\s*\.reduce\s*\($/, text: '(acc, x) => acc + x, 0);' },
        { re: /^\s*try\s*\{?\s*$/, text: '\n\t\n} catch (e) {\n\t\n}' },
        { re: /^\s*async\s+function\s+$/, text: '() {' },
        { re: /^\s*await\s+$/, text: '' },
        { re: /^\s*class\s+(\w+)\s*\{?\s*$/, text: '\n\tconstructor() {\n\t\t\n\t}\n}' },
      ],
      // === TypeScript ===
      typescript: [
        { re: /^\s*const\s+(\w+):\s*$/, text: 'string = ;' },
        { re: /^\s*interface\s+(\w+)\s*\{?\s*$/, text: '\n\t\n}' },
        { re: /^\s*type\s+(\w+)\s*=\s*$/, text: '{};' },
        { re: /^\s*function\s+(\w+)\s*\($/, text: '): void {' },
        { re: /^\s*for\s*\(let\s+(\w+)\s*=\s*0\s*;\s*$/, text: (m) => `${m[1]} < n; ${m[1]}++) {` },
        { re: /^\s*for\s*\($/, text: 'let i = 0; i < n; i++) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
        { re: /^\s*console\.log\s*\($/, text: ');' },
        { re: /^\s*return\s+$/, text: ';' },
        { re: /^\s*export\s+$/, text: 'default ' },
        { re: /^\s*import\s+\{$/, text: ' } from ;' },
      ],
      // === Go ===
      go: [
        { re: /^\s*package\s*$/, text: 'main' },
        { re: /^\s*package\s+main\s*$/, text: '\n\nimport "fmt"\n\nfunc main() {\n\t\n}' },
        { re: /^\s*import\s+"$/, text: 'fmt"' },
        { re: /^\s*func\s+main\s*\(\s*\)\s*\{?\s*$/, text: '\n\t' },
        { re: /^\s*func\s+(\w+)\s*\($/, text: ') {' },
        { re: /^\s*fmt\.Print$/, text: 'ln()' },
        { re: /^\s*fmt\.Scan$/, text: '(&n)' },
        { re: /^\s*for\s+(\w+)\s*:=\s*0\s*;\s*$/, text: (m) => `${m[1]} < n; ${m[1]}++ {` },
        { re: /^\s*for\s+$/, text: 'i := 0; i < n; i++ {' },
        { re: /^\s*if\s+$/, text: '{' },
        { re: /^\s*var\s+$/, text: 'n int' },
        { re: /^\s*:=\s*make\s*\($/, text: '[]int, n)' },
      ],
      // === Rust ===
      rust: [
        { re: /^\s*fn\s+main\s*\(\s*\)\s*\{?\s*$/, text: '\n\tlet mut input = String::new();\n\tstd::io::stdin().read_line(&mut input).unwrap();\n\t' },
        { re: /^\s*fn\s+(\w+)\s*\($/, text: ') {' },
        { re: /^\s*let\s+mut\s+(\w+)\s*$/, text: '= ;' },
        { re: /^\s*let\s+(\w+)\s*$/, text: '= ;' },
        { re: /^\s*println!\s*\($/, text: '"{}",);' },
        { re: /^\s*for\s+(\w+)\s+in\s*$/, text: '0..n {' },
        { re: /^\s*if\s+$/, text: '{' },
        { re: /^\s*match\s+$/, text: '{\n\t\n}' },
        { re: /^\s*use\s+std::$/, text: 'io;' },
        { re: /^\s*impl\s+(\w+)\s*\{?\s*$/, text: '\n\t\n}' },
        { re: /^\s*struct\s+(\w+)\s*\{?\s*$/, text: '\n\t\n}' },
      ],
      // === C# ===
      csharp: [
        { re: /^\s*using\s+System$/, text: ';' },
        { re: /^\s*using\s+System;\s*$/, text: '\nusing System.Collections.Generic;\nusing System.Linq;' },
        { re: /^\s*class\s+Program\s*\{?\s*$/, text: '\n\tstatic void Main() {\n\t\t\n\t}\n}' },
        { re: /^\s*static\s+void\s+Main\s*\($/, text: ') {' },
        { re: /^\s*Console\.Write$/, text: 'Line();' },
        { re: /^\s*Console\.Read$/, text: 'Line();' },
        { re: /^\s*int\s+(\w+)\s*=\s*$/, text: 'int.Parse(Console.ReadLine());' },
        { re: /^\s*for\s*\(int\s+(\w+)\s*=\s*0\s*;\s*$/, text: (m) => `${m[1]} < n; ${m[1]}++) {` },
        { re: /^\s*for\s*\($/, text: 'int i = 0; i < n; i++) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
        { re: /^\s*List<$/, text: 'int> list = new List<int>();' },
        { re: /^\s*Dictionary<$/, text: 'int, int> dict = new Dictionary<int, int>();' },
      ],
      // === Ruby ===
      ruby: [
        { re: /^\s*def\s+(\w+)$/, text: '\n\t\nend' },
        { re: /^\s*puts\s*$/, text: '' },
        { re: /^\s*gets\.$/, text: 'chomp' },
        { re: /^\s*(\w+)\.each\s*$/, text: 'do |x|' },
        { re: /^\s*(\w+)\.map\s*$/, text: '{ |x| x }' },
        { re: /^\s*if\s+$/, text: '\n\t\nend' },
        { re: /^\s*while\s+$/, text: '\n\t\nend' },
        { re: /^\s*class\s+(\w+)$/, text: '\n\tdef initialize\n\t\t\n\tend\nend' },
        { re: /^\s*n\s*=\s*gets$/, text: '.to_i' },
        { re: /^\s*arr\s*=\s*gets$/, text: '.split.map(&:to_i)' },
      ],
      // === PHP ===
      php: [
        { re: /^\s*<\?php\s*$/, text: '\n' },
        { re: /^\s*function\s+(\w+)\s*\($/, text: ') {' },
        { re: /^\s*echo\s+$/, text: ';' },
        { re: /^\s*\$(\w+)\s*=\s*$/, text: ';' },
        { re: /^\s*for\s*\(\$(\w+)\s*=\s*0\s*;\s*$/, text: (m) => `$${m[1]} < $n; $${m[1]}++) {` },
        { re: /^\s*foreach\s*\($/, text: '$arr as $val) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
      ],
      // === Kotlin ===
      kotlin: [
        { re: /^\s*fun\s+main\s*\($/, text: ') {' },
        { re: /^\s*fun\s+main\s*\(\s*\)\s*\{?\s*$/, text: '\n\tval n = readLine()!!.toInt()\n\t' },
        { re: /^\s*fun\s+(\w+)\s*\($/, text: '): {' },
        { re: /^\s*val\s+(\w+)\s*=\s*$/, text: '' },
        { re: /^\s*var\s+(\w+)\s*=\s*$/, text: '' },
        { re: /^\s*println\s*\($/, text: ')' },
        { re: /^\s*readLine\s*\(\)\s*!!$/, text: '.toInt()' },
        { re: /^\s*for\s*\((\w+)\s+in\s*$/, text: '0 until n) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
      ],
      // === Scala ===
      scala: [
        { re: /^\s*object\s+Main\s*\{?\s*$/, text: '\n\tdef main(args: Array[String]): Unit = {\n\t\t\n\t}\n}' },
        { re: /^\s*def\s+(\w+)\s*\($/, text: '): Unit = {' },
        { re: /^\s*val\s+(\w+)\s*=\s*$/, text: '' },
        { re: /^\s*println\s*\($/, text: ')' },
        { re: /^\s*for\s*\((\w+)\s*<-\s*$/, text: '0 until n) {' },
      ],
      // === Swift ===
      swift: [
        { re: /^\s*func\s+(\w+)\s*\($/, text: ') {' },
        { re: /^\s*let\s+(\w+)\s*=\s*$/, text: '' },
        { re: /^\s*var\s+(\w+)\s*=\s*$/, text: '' },
        { re: /^\s*print\s*\($/, text: ')' },
        { re: /^\s*guard\s+let\s*$/, text: ' = readLine() else { return }' },
        { re: /^\s*if\s+let\s+$/, text: '= {' },
        { re: /^\s*for\s+(\w+)\s+in\s*$/, text: '0..<n {' },
        { re: /^\s*if\s+$/, text: '{' },
        { re: /^\s*while\s+$/, text: '{' },
      ],
      // === Dart ===
      dart: [
        { re: /^\s*void\s+main\s*\($/, text: ') {' },
        { re: /^\s*void\s+main\s*\(\s*\)\s*\{?\s*$/, text: "\n\tvar n = int.parse(stdin.readLineSync()!);\n\t" },
        { re: /^\s*print\s*\($/, text: ');' },
        { re: /^\s*var\s+(\w+)\s*=\s*$/, text: ';' },
        { re: /^\s*for\s*\(var\s+(\w+)\s*=\s*0\s*;\s*$/, text: (m) => `${m[1]} < n; ${m[1]}++) {` },
        { re: /^\s*if\s*\($/, text: ') {' },
      ],
      // === Perl ===
      perl: [
        { re: /^\s*my\s+\$(\w+)\s*=\s*$/, text: ';' },
        { re: /^\s*print\s+$/, text: '"\\n";' },
        { re: /^\s*for\s+my\s+\$(\w+)\s*\($/, text: '0..$n-1) {' },
        { re: /^\s*foreach\s+my\s+\$(\w+)\s*\($/, text: '@arr) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
        { re: /^\s*sub\s+(\w+)\s*\{?\s*$/, text: '\n\t\n}' },
        { re: /^\s*chomp\s*\($/, text: 'my $line = <STDIN>);' },
      ],
      // === Lua ===
      lua: [
        { re: /^\s*function\s+(\w+)\s*\($/, text: ')' },
        { re: /^\s*local\s+(\w+)\s*=\s*$/, text: '' },
        { re: /^\s*for\s+(\w+)\s*=\s*1\s*,\s*$/, text: 'n do' },
        { re: /^\s*for\s+$/, text: 'i = 1, n do' },
        { re: /^\s*if\s+$/, text: 'then' },
        { re: /^\s*while\s+$/, text: 'do' },
        { re: /^\s*print\s*\($/, text: ')' },
        { re: /^\s*io\.read\s*\($/, text: '"*n")' },
      ],
      // === Shell/Bash ===
      shell: [
        { re: /^#!/, text: '/bin/bash' },
        { re: /^\s*read\s+$/, text: 'n' },
        { re: /^\s*echo\s+$/, text: '"$n"' },
        { re: /^\s*for\s+(\w+)\s+in\s*$/, text: '$(seq 1 $n); do' },
        { re: /^\s*for\s*\(\(\s*(\w+)=0\s*;\s*$/, text: (m) => `${m[1]}<n; ${m[1]}++ )); do` },
        { re: /^\s*if\s+\[\s*$/, text: ']; then' },
        { re: /^\s*while\s+\[\s*$/, text: ']; do' },
        { re: /^\s*function\s+(\w+)\s*$/, text: '() {' },
      ],
      // === R ===
      r: [
        { re: /^\s*(\w+)\s*<-\s*$/, text: '' },
        { re: /^\s*print\s*\($/, text: ')' },
        { re: /^\s*cat\s*\($/, text: '"\\n")' },
        { re: /^\s*for\s*\((\w+)\s+in\s*$/, text: '1:n) {' },
        { re: /^\s*if\s*\($/, text: ') {' },
        { re: /^\s*function\s*\($/, text: ') {' },
        { re: /^\s*n\s*<-\s*as\.integer\s*\($/, text: 'readLines("stdin", n=1))' },
      ],
    };

    // Map our language IDs to pattern sets (share patterns for similar languages)
    const langPatternMap = {
      c: 'cpp', cpp: 'cpp',
      python: 'python',
      java: 'java',
      javascript: 'javascript', typescript: 'typescript',
      go: 'go', rust: 'rust', csharp: 'csharp',
      ruby: 'ruby', php: 'php', kotlin: 'kotlin',
      scala: 'scala', swift: 'swift', dart: 'dart',
      perl: 'perl', lua: 'lua', shell: 'shell', r: 'r',
    };

    // Collect all unique words from the editor for variable/function name predictions
    const getDocumentWords = (model, position) => {
      const words = new Set();
      const lc = model.getLineCount();
      for (let i = 1; i <= lc; i++) {
        if (i === position.lineNumber) continue;
        const line = model.getLineContent(i);
        const matches = line.match(/\b[a-zA-Z_]\w{2,}\b/g);
        if (matches) matches.forEach(w => words.add(w));
      }
      return words;
    };

    // ── AI completion state ──
    const aiState = {
      enabled: true,
      cache: new Map(),           // key → { text, ts }
      pending: null,              // current AbortController
      debounceTimer: null,
      lastRequestMs: 0,
      DEBOUNCE_MS: 350,           // reduced: Gemini is fast enough
      CACHE_TTL: 90000,           // match server cache TTL
      MIN_PREFIX_LINES: 2,        // trigger earlier
      indicator: null,            // DOM element for AI status
    };
    this._aiState = aiState;      // expose for toggle

    // Build a cache key from cursor context
    const aiCacheKey = (prefix, suffix, lang) => {
      const pLines = prefix.split('\n').slice(-8).join('\n').trim();
      const sLines = (suffix || '').split('\n').slice(0, 3).join('\n').trim();
      return `${lang}::${pLines}::${sLines}`;
    };

    // Register inline completion for each Monaco language
    const registeredInline = new Set();
    for (const lang of this._langs) {
      const monacoLang = lang.mono;
      if (registeredInline.has(monacoLang)) continue;
      registeredInline.add(monacoLang);

      const patternKey = langPatternMap[lang.id];
      const langPatterns = patternKey ? patterns[patternKey] : null;
      const langId = lang.id;

      monaco.languages.registerInlineCompletionsProvider(monacoLang, {
        provideInlineCompletions(model, position, context, token) {
          const lineContent = model.getLineContent(position.lineNumber);
          const textBefore = lineContent.substring(0, position.column - 1);
          const trimmedBefore = textBefore.trimStart();

          // Don't suggest in comments or strings
          if (/^\s*(\/\/|#|--|\/\*)/.test(lineContent) && !trimmedBefore.startsWith('#inc') && !trimmedBefore.startsWith('#!') && !trimmedBefore.startsWith('#define')) {
            return { items: [] };
          }

          const items = [];

          // 1) Pattern-based predictions (instant, no AI)
          if (langPatterns) {
            for (const p of langPatterns) {
              const match = trimmedBefore.match(p.re);
              if (match) {
                const text = typeof p.text === 'function' ? p.text(match) : p.text;
                if (text) {
                  items.push({
                    insertText: { snippet: text },
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                  });
                }
                break;
              }
            }
          }

          // 2) Bracket/brace auto-close line completion
          if (!items.length) {
            const openBraces = (textBefore.match(/\{/g) || []).length;
            const closeBraces = (textBefore.match(/\}/g) || []).length;
            if (textBefore.trim().endsWith('{') && openBraces > closeBraces) {
              items.push({
                insertText: { snippet: '\n\t' },
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              });
            }
          }

          // 3) Word completion from document context
          if (!items.length && trimmedBefore.length >= 2) {
            const lastWord = trimmedBefore.match(/\b([a-zA-Z_]\w*)$/);
            if (lastWord && lastWord[1].length >= 2) {
              const prefix = lastWord[1].toLowerCase();
              const docWords = getDocumentWords(model, position);
              for (const w of docWords) {
                if (w.toLowerCase().startsWith(prefix) && w.toLowerCase() !== prefix) {
                  items.push({
                    insertText: { snippet: w.substring(lastWord[1].length) },
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                  });
                  break;
                }
              }
            }
          }

          // 4) AI-powered ghost text (async fallback — uses cached result or triggers background fetch)
          if (!items.length && aiState.enabled && trimmedBefore.length >= 3) {
            const fullText = model.getValue();
            const offset = model.getOffsetAt(position);
            const prefix = fullText.substring(0, offset);
            const suffix = fullText.substring(offset);

            // Only call AI if there's enough context
            if (prefix.split('\n').length >= aiState.MIN_PREFIX_LINES) {
              const key = aiCacheKey(prefix, suffix, langId);
              const cached = aiState.cache.get(key);

              if (cached && Date.now() - cached.ts < aiState.CACHE_TTL && cached.text) {
                // Serve from cache
                items.push({
                  insertText: cached.text,
                  range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                });
              } else {
                // Trigger async AI fetch (result will show on next keystroke from cache)
                clearTimeout(aiState.debounceTimer);
                aiState.debounceTimer = setTimeout(() => {
                  // Abort any in-flight request
                  if (aiState.pending) aiState.pending.abort();
                  const ac = new AbortController();
                  aiState.pending = ac;

                  // Show indicator
                  App._setAiIndicator('thinking');

                  API.aiComplete(prefix, suffix, langId)
                    .then(r => {
                      if (ac.signal.aborted) return;
                      if (r.ok && r.text) {
                        aiState.cache.set(key, { text: r.text, ts: Date.now() });
                        // Evict old entries
                        if (aiState.cache.size > 150) {
                          const oldest = aiState.cache.keys().next().value;
                          aiState.cache.delete(oldest);
                        }
                        App._setAiIndicator('ready');
                        // Trigger re-evaluation of inline completions
                        try {
                          const ed = App.editor;
                          if (ed) {
                            // Nudge Monaco to re-request inline completions
                            ed.trigger('ai', 'editor.action.inlineSuggest.trigger', {});
                          }
                        } catch(_) {}
                      } else {
                        App._setAiIndicator('idle');
                      }
                    })
                    .catch(() => App._setAiIndicator('idle'))
                    .finally(() => { aiState.pending = null; });
                }, aiState.DEBOUNCE_MS);
              }
            }
          }

          return { items };
        },
        freeInlineCompletions() {},
      });
    }
  },

  /* ── AI Helper indicator & controls ── */
  _setAiIndicator(state) {
    let el = document.getElementById('aiHelperIndicator');
    if (!el) return;
    el.className = 'ai-helper-indicator';
    if (state === 'thinking') {
      el.classList.add('ai-thinking');
      el.innerHTML = '<i class="icon-bolt"></i> <span>AI thinking…</span>';
    } else if (state === 'ready') {
      el.classList.add('ai-ready');
      el.innerHTML = '<i class="icon-bolt"></i> <span>AI ready</span>';
      // Auto-fade after 2s
      setTimeout(() => {
        if (el.classList.contains('ai-ready')) {
          el.classList.remove('ai-ready');
          el.innerHTML = '<i class="icon-bolt"></i>';
        }
      }, 2000);
    } else {
      el.innerHTML = '<i class="icon-bolt"></i>';
    }
  },

  toggleAiHelper() {
    if (!this._aiState) return;
    this._aiState.enabled = !this._aiState.enabled;
    const el = document.getElementById('aiHelperToggle');
    if (el) {
      el.classList.toggle('active', this._aiState.enabled);
      el.title = this._aiState.enabled ? 'AI Helper ON (click to disable)' : 'AI Helper OFF (click to enable)';
    }
    const ind = document.getElementById('aiHelperIndicator');
    if (ind) ind.classList.toggle('ai-disabled', !this._aiState.enabled);
    this._toast(this._aiState.enabled ? 'AI code helper enabled' : 'AI code helper disabled', 'info');
  },

  async aiFixCode() {
    if (!this.editor) return;
    const code = this.editor.getValue();
    if (!code.trim()) return this._toast('No code to fix', 'warning');

    const btn = document.getElementById('aiFixBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="icon-bolt"></i> fixing…'; }

    try {
      const result = await API.aiFix(code, this._currentLang, this._lastRunError || 'Compilation error');
      if (result.ok && result.fixed && result.code) {
        // Show diff in a confirmation
        const oldLines = code.split('\n').length;
        const newLines = result.code.split('\n').length;
        const changed = oldLines !== newLines || code !== result.code;

        if (changed) {
          // Apply the fix
          this.editor.setValue(result.code);
          this._toast('AI applied syntax fix', 'success');
        } else {
          this._toast('Code looks correct — no fix needed', 'info');
        }
      } else {
        this._toast(result.message || 'No syntax fix found — may be a logic issue', 'info');
      }
    } catch (e) {
      this._toast('AI fix failed: ' + e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="icon-bolt"></i> ai fix'; }
    }
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
      c: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
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
      typescript: `import * as readline from 'readline';
const rl = readline.createInterface({ input: process.stdin });
const lines: string[] = [];

rl.on('line', (line: string) => lines.push(line));
rl.on('close', () => {
    // Your solution here
    
});
`,
      csharp: `using System;
using System.IO;

class Solution {
    static void Main(string[] args) {
        // Your solution here
        string line = Console.ReadLine();
        Console.WriteLine(line);
    }
}
`,
      go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

var reader *bufio.Reader
var writer *bufio.Writer

func main() {
    reader = bufio.NewReader(os.Stdin)
    writer = bufio.NewWriter(os.Stdout)
    defer writer.Flush()
    
    // Your solution here
    var s string
    fmt.Fscan(reader, &s)
    fmt.Fprintln(writer, s)
}
`,
      rust: `use std::io::{self, BufRead, Write, BufWriter};

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    
    for line in stdin.lock().lines() {
        let line = line.unwrap();
        // Your solution here
        writeln!(out, "{}", line).unwrap();
    }
}
`,
      kotlin: `import java.util.Scanner

fun main() {
    val sc = Scanner(System.\`in\`)
    
    // Your solution here
    
}
`,
      ruby: `# Your solution here
while line = gets&.chomp
    puts line
end
`,
      php: `<?php
// Your solution here
while ($line = trim(fgets(STDIN))) {
    echo $line . PHP_EOL;
}
?>
`,
      perl: `use strict;
use warnings;

# Your solution here
while (<STDIN>) {
    chomp;
    print "$_\n";
}
`,
      lua: `-- Your solution here
for line in io.lines() do
    print(line)
end
`,
      shell: `#!/bin/bash

# Your solution here
while IFS= read -r line; do
    echo "$line"
done
`,
      powershell: `# Your solution here
$input | ForEach-Object {
    Write-Output $_
}
`,
      r: `con <- file("stdin", "r")
lines <- readLines(con)
close(con)

# Your solution here
cat(lines, sep="\n")
`,
      julia: `# Your solution here
for line in eachline(stdin)
    println(line)
end
`,
      scala: `import scala.io.Source
import scala.io.StdIn

object Main extends App {
    val lines = Source.stdin.getLines().toList
    
    // Your solution here
    
}
`,
      fsharp: `open System

[<EntryPoint>]
let main _ =
    // Your solution here
    let line = Console.ReadLine()
    printfn "%s" line
    0
`,
      clojure: `(ns solution.core
  (:require [clojure.string :as str]))

(defn -main []
  ;; Your solution here
  (let [line (read-line)]
    (println line)))

(-main)
`,
      scheme: `(define (main)
  ;; Your solution here
  (let ((line (read-line)))
    (display line)
    (newline)))

(main)
`,
      swift: `import Foundation

// Your solution here
while let line = readLine() {
    print(line)
}
`,
      dart: `import 'dart:io';

void main() {
    // Your solution here
    String? line = stdin.readLineSync();
    print(line);
}
`,
      objectivec: `#import <Foundation/Foundation.h>

int main(int argc, char *argv[]) {
    @autoreleasepool {
        // Your solution here
        NSFileHandle *fh = [NSFileHandle fileHandleWithStandardInput];
        NSData *data = [fh readDataToEndOfFile];
        NSString *input = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        NSLog(@"%@", input);
    }
    return 0;
}
`,
      sql: `-- Your solution here
SELECT *
FROM table_name
WHERE condition;
`,
      pgsql: `-- Your solution here (PostgreSQL)
SELECT *
FROM table_name
WHERE condition;
`,
      pascal: `program Solution;
var
    line : string;
begin
    { Your solution here }
    readln(line);
    writeln(line);
end.
`,
      vb: `Imports System

Module Solution
    Sub Main()
        ' Your solution here
        Dim line As String = Console.ReadLine()
        Console.WriteLine(line)
    End Sub
End Module
`,
      elixir: `defmodule Solution do
  def main do
    # Your solution here
    IO.gets("")
    |> String.trim()
    |> IO.puts()
  end
end

Solution.main()
`,
      tcl: `# Your solution here
while {[gets stdin line] >= 0} {
    puts $line
}
`,
      solidity: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Solution {
    // Your solution here
    
    function execute() public pure returns (string memory) {
        return "Hello, World!";
    }
}
`,
    };
    return templates[l] || templates.cpp;
  },

  /* ===== LANGUAGE SELECTOR ===== */
  toggleLangMenu() {
    const menu = document.getElementById('langMenu');
    const isOpen = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    if (!isOpen) {
      // Position using fixed coords so it escapes any overflow:hidden ancestor
      const btn = document.getElementById('langSelectorBtn');
      const rect = btn.getBoundingClientRect();
      menu.style.top  = (rect.bottom + 4) + 'px';
      menu.style.left = rect.left + 'px';
      this._buildLangMenu();
      const search = document.getElementById('langSearch');
      if (search) { search.value = ''; this._filterLangs(''); setTimeout(() => search.focus(), 50); }
      const close = (e) => {
        if (!e.target.closest('.lang-selector') && !e.target.closest('#langMenu')) {
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
    const langDef = this._langs.find(l => l.id === lang);
    if (langDef) {
      const badge = document.getElementById('langBadge');
      if (badge) { badge.textContent = langDef.badge; badge.className = `lang-badge group-${langDef.g}`; }
      const lbl = document.getElementById('langLabel');
      if (lbl) lbl.textContent = langDef.label;
    }
    document.querySelectorAll('.lang-option').forEach(el => {
      el.classList.toggle('active', el.dataset.lang === lang);
    });
    document.getElementById('langMenu').classList.add('hidden');
    if (this.editor) {
      const monacoLang = langDef ? langDef.mono : 'plaintext';
      const model = this.editor.getModel();
      monaco.editor.setModelLanguage(model, monacoLang);
      this.editor.setValue(this._defaultCode(lang));
    }
  },

  _buildLangMenu() {
    const container = document.getElementById('langGroups');
    if (!container) return;
    container.innerHTML = '';
    const groupOrder = ['popular','scripting','data','functional','mobile','db','classic','other'];
    groupOrder.forEach(gKey => {
      const langs = this._langs.filter(l => l.g === gKey);
      if (!langs.length) return;
      const info = this._langGroups[gKey];
      const section = document.createElement('div');
      section.className = 'lang-group-section';
      section.dataset.group = gKey;
      section.innerHTML = `<div class="lang-group-label" style="color:${info.color}">${info.label}</div>` +
        langs.map(l => `<button class="lang-option${l.id === this._currentLang ? ' active' : ''}" data-lang="${l.id}" onclick="App.selectLang('${l.id}')"><span class="lang-badge group-${l.g}">${l.badge}</span>${l.label}</button>`).join('');
      container.appendChild(section);
    });
  },

  _filterLangs(q) {
    const query = q.toLowerCase();
    document.querySelectorAll('#langGroups .lang-group-section').forEach(section => {
      let visible = 0;
      section.querySelectorAll('.lang-option').forEach(btn => {
        const match = !query || btn.textContent.toLowerCase().includes(query) || btn.dataset.lang.includes(query);
        btn.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      section.style.display = visible ? '' : 'none';
    });
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
    const isSolving = !document.getElementById('solveOverlay')?.classList.contains('hidden');
    const base = [
      { type: 'nav', label: 'HQ / Dashboard', desc: 'cd ~/command_center  [⌘1]', icon: 'icon-dashboard', action: () => { location.hash = '#/hub'; } },
      { type: 'nav', label: 'Problems', desc: 'grep -r "challenge"  [⌘2]', icon: 'icon-problems', action: () => { location.hash = '#/problems'; } },
      { type: 'nav', label: 'Progress (Nexus)', desc: 'cat stats.log  [⌘3]', icon: 'icon-arena', action: () => { location.hash = '#/nexus'; } },
      { type: 'nav', label: 'AI Lab', desc: 'python3 neural.py  [⌘4]', icon: 'icon-neural', action: () => { location.hash = '#/ailab'; } },
      { type: 'nav', label: 'Learn', desc: 'import knowledge  [⌘5]', icon: 'icon-learn', action: () => { location.hash = '#/learn'; } },
      { type: 'nav', label: 'The Forge', desc: 'make build  [⌘6]', icon: 'icon-hammer', action: () => { location.hash = '#/forge'; } },
      { type: 'nav', label: 'Workshop', desc: 'vim sandbox.cpp  [⌘7]', icon: 'icon-code', action: () => { location.hash = '#/workshop'; } },
      { type: 'nav', label: 'Contests', desc: './arena --live', icon: 'icon-contests', action: () => { location.hash = '#/contests'; } },
      { type: 'nav', label: 'Squad / Social', desc: 'ssh party@nexus  [⌘8]', icon: 'icon-friends', action: () => { location.hash = '#/social'; } },
      { type: 'nav', label: 'My Profile', desc: 'view your stats page', icon: 'icon-user', action: () => { location.hash = `#/profile/${this._username}`; } },
      { type: 'action', label: 'Random Problem', desc: 'roll dice on unsolved  [⌘B]', icon: 'icon-dice', action: () => { this._randomProblem(); } },
      { type: 'action', label: 'Settings', desc: 'open config panel', icon: 'icon-settings', action: () => { this.openSettings(); } },
      { type: 'action', label: 'Sync Problems', desc: 'git pull from OJs', icon: 'icon-sync', action: () => { this._autoSync(); } },
      { type: 'action', label: 'Keyboard Shortcuts', desc: 'view all keybinds  [?]', icon: 'icon-bolt', action: () => { this.openShortcuts(); } },
      { type: 'action', label: 'Zen / Focus Mode', desc: 'toggle distraction-free  [⌘⇧F]', icon: 'icon-focus', action: () => { this.toggleFocusMode(); } },
      { type: 'action', label: 'Daily Challenges', desc: 'view today\'s missions', icon: 'icon-sword', action: () => { location.hash = '#/hub'; setTimeout(() => { const el = document.getElementById('dailyChallengesSection'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 400); } },
      { type: 'action', label: 'Fire Confetti', desc: 'test celebration effect', icon: 'icon-check', action: () => { this._fireConfetti(); } },
    ];
    if (isSolving) {
      base.unshift(
        { type: 'action', label: 'Run Code', desc: 'execute against test cases  [⌘↵]', icon: 'icon-play', action: () => { this.runCode(); } },
        { type: 'action', label: 'Submit Code', desc: 'judge final solution  [⌘⇧↵]', icon: 'icon-upload', action: () => { this.submitCode(); } },
        { type: 'action', label: 'Reset Code', desc: 'restore default template', icon: 'icon-sync', action: () => { this.resetCode(); } },
      );
    }
    return base;
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
        { keys: `${mod} + ⇧ + F`, desc: 'Toggle Focus / Zen Mode' },
        { keys: `${mod} + B`, desc: 'Random problem (Battle mode)' },
        { keys: 'Esc', desc: 'Close overlay / modal' },
      ]},
      { section: 'Editor', items: [
        { keys: `${mod} + ↵`, desc: 'Run Code' },
        { keys: `${mod} + ⇧ + ↵`, desc: 'Submit Code' },
      ]},
      { section: 'Navigation', items: [
        { keys: `${mod} + 1`, desc: 'Dashboard' },
        { keys: `${mod} + 2`, desc: 'Problems' },
        { keys: `${mod} + 3`, desc: 'Progress (Nexus)' },
        { keys: `${mod} + 4`, desc: 'AI Lab' },
        { keys: `${mod} + 5`, desc: 'Learn' },
        { keys: `${mod} + 6`, desc: 'Forge (Learning Paths)' },
        { keys: `${mod} + 7`, desc: 'Workshop' },
        { keys: `${mod} + 8`, desc: 'Social / Squad' },
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

    const colors = ['#1d4ed8','#059669','#14b8a6','#d4a017','#fbbf24','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6'];
    const particles = [];

    // Burst from 3 origins: center, bottom-left, bottom-right
    const origins = [
      { x: canvas.width / 2, y: canvas.height * 0.55 },
      { x: canvas.width * 0.15, y: canvas.height },
      { x: canvas.width * 0.85, y: canvas.height },
    ];

    for (const origin of origins) {
      for (let i = 0; i < 70; i++) {
        const angle = origin.y === canvas.height
          ? -(Math.random() * 60 + 60) * (Math.PI / 180) + (origin.x < canvas.width / 2 ? Math.PI / 4 : Math.PI * 3 / 4)
          : Math.random() * Math.PI * 2;
        const speed = Math.random() * 14 + 6;
        particles.push({
          x: origin.x + (Math.random() - 0.5) * 60,
          y: origin.y,
          vx: Math.cos(angle) * speed * (origin.y < canvas.height ? 1 : 0.9),
          vy: origin.y === canvas.height ? -Math.random() * 18 - 8 : Math.sin(angle) * speed,
          w: Math.random() * 9 + 3,
          h: Math.random() * 5 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * 360,
          rotV: (Math.random() - 0.5) * 16,
          gravity: 0.32 + Math.random() * 0.18,
          alpha: 1,
          decay: 0.005 + Math.random() * 0.007,
          shape: Math.random() > 0.7 ? 'circle' : 'rect',
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive = true;
        p.x += p.vx; p.y += p.vy;
        p.vy += p.gravity; p.vx *= 0.99;
        p.rot += p.rotV; p.alpha -= p.decay;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (alive) requestAnimationFrame(animate);
      else canvas.remove();
    };
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

  toast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toasts');
    // Limit max visible toasts to 5
    const existing = container.querySelectorAll('.toast');
    if (existing.length >= 5) existing[0].remove();

    const icons = { success: 'icon-check', error: 'icon-cross', warning: 'icon-bolt', info: 'icon-bolt' };
    const iconClass = icons[type] || 'icon-bolt';
    const iconColors = { success: '#6ee7b7', error: '#fca5a5', warning: '#fde68a', info: '#93c5fd' };
    const ic = iconColors[type] || iconColors.info;

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <span class="toast-icon-wrap"><i class="${iconClass}" style="font-size:15px;color:${ic}"></i></span>
      <span class="toast-msg">${this._esc(msg)}</span>
      <span class="toast-close" aria-label="dismiss">&times;</span>
      <span class="toast-bar" style="width:100%;transition:width ${duration}ms linear;"></span>`;

    const dismiss = () => {
      if (el._dismissed) return;
      el._dismissed = true;
      el.classList.add('removing');
      setTimeout(() => el.remove(), 320);
    };

    el.addEventListener('click', dismiss);
    container.appendChild(el);

    // Kick off progress bar shrink on next frame
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const bar = el.querySelector('.toast-bar');
      if (bar) bar.style.width = '0%';
    }));

    el._timer = setTimeout(dismiss, duration);
    return el;
  },

  /* ===================================================
     ANIMATED COUNT-UP
     =================================================== */
  _animateCount(el, from, to, durationMs = 700) {
    if (!el) return;
    const start = performance.now();
    const update = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(from + (to - from) * ease);
      el.textContent = cur.toLocaleString();
      if (t < 1) requestAnimationFrame(update);
      else el.textContent = to.toLocaleString();
    };
    requestAnimationFrame(update);
  },

  /* ===================================================
     SKELETON HELPERS
     =================================================== */
  _skeletonCard(rows = 3) {
    const lines = Array.from({ length: rows }, (_, i) => {
      const w = i === 0 ? 'medium' : i % 2 === 0 ? 'full' : 'short';
      return `<div class="skeleton skeleton-line ${w}"></div>`;
    }).join('');
    return `<div class="skeleton-card">${lines}</div>`;
  },

  _skeletonGrid(cols = 4) {
    return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px">${
      Array.from({ length: cols }, () => this._skeletonCard(3)).join('')
    }</div>`;
  },

  /* ===================================================
     LIVE CLOCK
     =================================================== */
  _startLiveClock(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      el.querySelector('.clock-time').textContent = `${h}:${m}:${s}`;
    };
    tick();
    if (this._clockInterval) clearInterval(this._clockInterval);
    this._clockInterval = setInterval(tick, 1000);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
