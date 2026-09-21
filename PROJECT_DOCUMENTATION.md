# Nexora - Complete Project Documentation

## 🎯 Project Overview

**Nexora** is a cutting-edge, gamified competitive programming learning platform with AI integration, real-time collaboration, and comprehensive skill progression tracking. It's a full-stack web application combining competitive programming practice with modern learning resources and social features.

**Version:** 2.0.0  
**Language:** Node.js Backend, Vanilla JavaScript Frontend  
**Database:** SQLite  
**Real-time Communication:** Socket.io  
**AI Integration:** Groq API (LLaMA models)

---

## 📊 Key Features

### 1. **Rift Level Progression System** (11-tier gamification)
- **Levels:** Bit → Byte → Kilobyte → Megabyte → Gigabyte → Terabyte → Petabyte → Exabyte → Zettabyte → Yottabyte → ∞ Overflow
- **XP System:** 10-150 XP per problem (based on rating)
- **Combo Multipliers:** 2-5x for consecutive solves
- **Speed Bonuses:** +50% for <5min solves, +25% for <15min solves
- **Custom SVG Badges** for each tier with animations and visual effects

### 2. **80+ Integrated Problems**
- **Supported Platforms:**
  - Codeforces
  - CodeChef
  - AtCoder
  - LeetCode
  - SPOJ
  - Project Euler
  
- **Features:**
  - Advanced filtering: platform, rating (800-3500+), tags, status
  - Pagination & sorting support
  - Real-time problem statement caching
  - Scraping with multiple data collection strategies (HTTP & Puppeteer-based browser automation)

### 3. **30+ Language Judge System**
- **Supported Languages:** C++, Python, Java, JavaScript, TypeScript, Go, Rust, Kotlin, Ruby, PHP, C#, Scala, Swift, Dart, Perl, Lua, Shell, R, PowerShell, Julia, F#, Clojure, Scheme, Objective-C, SQL, PostgreSQL, Pascal, VB, Elixir, Tcl

- **Verdicts:** AC (Accepted), WA (Wrong Answer), TLE (Time Limit Exceeded), RE (Runtime Error), CE (Compilation Error), MLE (Memory Limit Exceeded)

- **Execution Strategy:**
  - Local execution with per-language time limits (5-15 seconds)
  - Fallback to Wandbox Remote API for unavailable languages
  - Keep-alive HTTPS agents for connection pooling
  - Sandbox isolation using temp directories

### 4. **Gamification & Achievements** (15+ achievements)
- **Milestones:** 10, 50, 100, 500 problems solved
- **Perfect Solve Bonus:** First-attempt completions
- **Time-based:** Night Owl, Early Bird achievements
- **Streaks:** 3, 7, 30-day streaks
- **Rating-based:** 1000, 1400, 1800, 2100+ achievements

### 5. **Advanced Analytics Dashboard**
- **Dual Rating Charts:** Performance tracking over time
- **365-Day Heatmap:** GitHub-style activity grid
- **Radar Chart:** Tag-based skill analysis
- **Verdict Distribution:** AC/WA/TLE breakdown
- **Weakness Analysis:** AI-powered recommendations
- **Code Replay:** Record and playback coding sessions

### 6. **Social & Real-time Collaboration**
- **Friends System:** Requests, accepts, unfriend functionality
- **Direct Messaging:** Real-time chat with typing indicators & read receipts
- **Solve Rooms:** Collaborative problem-solving with synchronized code
- **Voice Chat:** WebRTC peer-to-peer communication
- **Leaderboards:** Rank by XP, solved count, or streak
- **Activity Feeds:** Track friend progress in real-time

### 7. **Nexus Skill Tree System**
- **50+ Skill Nodes** organized in 11 zones
- **Prerequisite-based** node unlock system
- **Weekly Problem Pools:** Tag-based shuffling for variety
- **Zone Gates:** Level unlock requirements (unlock progressively as you advance)
- **Per-node Completion Tracking**

### 8. **Learning Resources**
- **Tutorials System:** Categorized lessons with progress tracking
- **Learn System:** 30+ topics with curated problem paths
- **AI Lab:** Domain-specific problems:
  - Machine Learning (ML)
  - Deep Learning (DL)
  - Natural Language Processing (NLP)
  - Computer Vision (CV)
  - Generative AI (GenAI)
  - Reinforcement Learning (RL)

- **Forge Roadmap:** Software development career paths with milestones:
  - Frontend Development
  - Backend Development
  - DevOps & Infrastructure
  - Full-Stack Development
  - Mobile Development
  - Data Science/ML
  - Cloud Architecture

### 9. **AI Integration Features**
- **AI Chat:** Context-aware tutoring without code answers (rule-enforced)
- **Code Completion:** Inline ghost-text suggestions
- **Error Detection:** Automatic syntax error repair
- **AI Battle:** 1v1 time-based racing against AI
- **Powered by:** Groq API with LLaMA-3.3-70B model
- **AI Caching:** Cache management with TTL for cost optimization

### 10. **Advanced Editor & IDE**
- **Monaco Editor:** Professional code editor with full syntax highlighting
- **Zen Mode:** Minimize distractions with collapsible panels
- **Resizable Panels:** Draggable editor, problem statement, and test case areas
- **Visual Debugger:** DBG_ARR/DBG_VAR macros for debugging output
- **Command Palette:** Cmd/Ctrl + K for quick actions
- **Customization:**
  - Font size adjustment
  - Tab size configuration
  - Word wrap toggle
  - Minimap visibility
  - Bracket pair colorization

### 11. **Studio & Content Management System (CMS)**
- **Workshop:** Create custom problems
- **Custom Contests:** Password-protected with participant scoring
- **Profile Customization:**
  - Avatar upload
  - Bio/description
  - Display name
  - Role-based access (admin/member)
  
- **Settings:** Comprehensive user preferences

### 12. **Authentication & Authorization**
- **OAuth Providers:** GitHub & Google OAuth integration
- **Username Registration:** 2-20 character constraint, alphanumeric + underscores
- **Admin System:** Role-based access control
- **Session Management:** Express-session with SQLite session store
- **Password Management:** bcrypt hashing for security

---

## 🏗️ Technology Stack

### Backend
- **Runtime:** Node.js v14+
- **Framework:** Express.js 4.x
- **Database:** SQLite3 (WAL mode for concurrency)
- **Session Store:** Better-SQLite3 Session Store
- **Real-time:** Socket.io 4.x
- **Authentication:** Passport.js with GitHub & Google OAuth strategies
- **Web Scraping:** 
  - Cheerio (lightweight HTTP parsing)
  - Puppeteer (browser automation for dynamic content)
- **HTTP Client:** node-fetch
- **Code Execution:** Child process spawn with timeout management
- **Compression:** gzip compression middleware
- **Security:** Helmet.js for HTTP headers, Rate limiting
- **File Upload:** Multer (max 50MB files, image/video/PDF/SVG support)

### Frontend
- **Language:** Vanilla JavaScript (no frameworks)
- **Editor:** Monaco Editor (VS Code's editor)
- **Real-time Client:** Socket.io client
- **Visualization:** 
  - Chart.js for analytics charts
  - Heatmap for activity grid
  - Radar chart for skill analysis
- **DOM:** Vanilla DOM manipulation
- **Storage:** LocalStorage for user preferences

### Dev Tools
- **Node Watching:** Node --watch (built-in)
- **Web Scraping Scripts:** Custom scrapers with rating-based filtering
- **Testing:** Node --test framework

---

## 📁 Project Structure

```
nexora/
├── public/                          # Static assets & frontend
│   ├── index.html                   # Main app entry point
│   ├── studio.html                  # Studio/CMS interface
│   ├── css/
│   │   ├── styles.css               # Main stylesheet
│   │   ├── effects.css              # Visual effects & animations
│   │   └── icons.css                # Icon definitions
│   ├── js/
│   │   ├── app.js                   # Main application logic (2000+ lines)
│   │   ├── api.js                   # API client wrapper functions
│   │   ├── app.config.js            # Frontend configuration & language definitions
│   │   ├── nexora-effects*.js       # Visual effects & particle systems
│   │   └── particles.js             # Particle animation engine
│   └── uploads/
│       └── studio/                  # User-uploaded content
│
├── src/                             # Backend source code
│   ├── server.js                    # Express server setup & routing
│   ├── db.js                        # SQLite database initialization & helpers
│   ├── judge.js                     # Code compilation & execution engine
│   ├── scraper.js                   # Problem scraper CLI tool
│   ├── sync.js                      # Platform API sync functions
│   ├── ai-problems-data.js          # AI/ML problem database
│   ├── dev-roadmap-data.js          # Forge roadmap paths & milestones
│   ├── tutorial-data.js             # Tutorial content definitions
│   │
│   ├── middleware/
│   │   └── auth.js                  # Authentication & authorization middleware
│   │
│   └── routes/
│       ├── auth.js                  # Auth endpoints (login, register, logout)
│       ├── learning.js              # Learning endpoints (AI chat, tutorials)
│       └── studio.js                # Studio/CMS endpoints (courses, content)
│
├── tests/
│   └── server-smoke.test.js         # Server smoke tests
│
├── _test_*.js                       # Ad-hoc testing scripts
├── package.json                     # Dependencies & scripts
├── tracker.db                       # SQLite database (generated at runtime)
└── .env                             # Environment variables (not in repo)
```

---

## 🗄️ Database Schema

### Core Tables

#### `users`
- `id` - Primary key
- `username` - Unique, 2-20 chars, alphanumeric + underscore
- `email` - OAuth email
- `auth_provider` - 'github', 'google', or 'local'
- `provider_id` - OAuth provider ID
- `password_hash` - Bcrypt hash (local auth)
- `display_name` - User's display name
- `avatar` - Avatar icon name
- `avatar_url` - Uploaded avatar URL
- `bio` - User bio/description
- `role` - 'admin' or 'member'
- `xp_override` - Admin XP boost
- `solved_override` - Admin solve count boost
- `created_at` - Account creation timestamp

#### `problems`
- `id` - Primary key
- `platform` - 'codeforces', 'codechef', 'atcoder', 'leetcode', 'spoj', 'euler'
- `problem_id` - Platform-specific ID
- `title` - Problem title
- `url` - Problem statement URL
- `rating` - Difficulty rating (800-3500+)
- `tags` - JSON array of problem tags
- `category` - Problem category
- **UNIQUE(platform, problem_id)** - Prevent duplicates

#### `progress`
- `id` - Primary key
- `problem_rowid` - Foreign key to problems
- `status` - 'unsolved', 'solving', 'solved'
- `attempts` - Number of submission attempts
- `solved_at` - Timestamp of first AC
- `time_spent` - Total seconds spent
- `notes` - User notes
- `xp_earned` - XP awarded
- **UNIQUE(problem_rowid)** - One progress record per problem per user

#### `submissions`
- `id` - Primary key
- `problem_rowid` - Foreign key to problems
- `code` - Submitted code
- `language` - Programming language
- `verdict` - AC/WA/TLE/RE/CE/MLE
- `exec_time_ms` - Execution time
- `memory_kb` - Memory usage
- `submitted_at` - Submission timestamp
- `test_results` - JSON array of individual test results

#### `testcases`
- `id` - Primary key
- `problem_rowid` - Foreign key to problems
- `label` - 'Sample 1', 'Test 2', etc.
- `input` - Input data
- `expected_output` - Expected output

#### `daily_activity`
- `date` - Date string (PRIMARY KEY)
- `problems_solved` - Count
- `problems_attempted` - Count
- `xp_earned` - Total XP
- `time_spent` - Total seconds

#### `achievements`
- `id` - Primary key
- `user_id` - Foreign key to users
- `achievement_type` - Achievement identifier
- `unlocked_at` - Unlock timestamp
- `progress` - Current progress value

#### `friends`
- `id` - Primary key
- `user_id1` - First user
- `user_id2` - Second user
- `status` - 'pending', 'accepted', 'blocked'
- `requested_at` - Timestamp
- **UNIQUE(user_id1, user_id2)** - Prevent duplicate requests

#### `messages`
- `id` - Primary key
- `sender_id` - Sender user ID
- `recipient_id` - Recipient user ID
- `content` - Message text
- `sent_at` - Timestamp
- `read_at` - Read timestamp (nullable)

#### `skill_nodes`
- `id` - Primary key
- `user_id` - Foreign key to users
- `node_id` - Skill tree node identifier
- `zone_id` - Skill tree zone
- `unlocked` - Boolean
- `completed` - Boolean
- `progress` - Completion percentage
- `unlocked_at` - Timestamp

#### `cms_courses` / `cms_chapters` / `cms_lessons`
- Content management system tables for studio content
- Hierarchical structure: courses → chapters → lessons
- Support for publishing, ordering, and metadata

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)
```
GET  /api/auth/status                    # Check authentication status
GET  /api/auth/providers                 # Get available OAuth providers
POST /api/auth/logout                    # Logout user
GET  /api/user/check-username?username=  # Check username availability
POST /api/user/register                  # Register new user
POST /api/user/login                     # Login with username/password
```

### Problems (`/api/problems`)
```
GET  /api/problems                       # List problems with filters/pagination
GET  /api/problems/:id                   # Get problem details
POST /api/problems/:id/submit            # Submit solution
GET  /api/problems/:id/testcases         # Get test cases
GET  /api/problems/:id/submissions       # Get submission history
```

### Learning (`/api/learn`)
```
POST /api/ai-chat                        # AI tutoring chat
GET  /api/tutorials                      # List tutorials
GET  /api/tutorials/:id                  # Get tutorial content
GET  /api/ai-problems                    # List AI/ML problems
GET  /api/forge-paths                    # List dev roadmap paths
GET  /api/forge-paths/:id                # Get path details
```

### Social (`/api/social`)
```
POST /api/friends/request                # Send friend request
POST /api/friends/accept/:id             # Accept friend request
GET  /api/friends/list                   # List friends
POST /api/messages/send                  # Send direct message
GET  /api/messages/:userId               # Get message history
```

### Studio/CMS (`/api/studio`)
```
POST /api/studio/upload                  # Upload media file
GET  /api/studio/courses                 # List courses
POST /api/studio/courses                 # Create course
PUT  /api/studio/courses/:id             # Update course
POST /api/studio/chapters                # Create chapter
POST /api/studio/lessons                 # Create lesson
```

### Real-time (Socket.io Events)
```
socket.emit('join-solve-room', roomId)       # Join collaborative solve
socket.emit('code-change', {code, lang})     # Send code updates
socket.emit('chat-message', {msg})           # Send room chat
socket.on('code-update', callback)           # Receive code changes
socket.on('chat-message', callback)          # Receive chat
```

---

## ⚙️ Key Implementation Details

### 1. Code Execution Engine (`judge.js`)
```javascript
// Execution Strategy:
1. Local execution with child_process.spawn()
2. Per-language time limits (5-15 seconds)
3. Temp directory isolation for security
4. STDIN/STDOUT piping for test case I/O
5. Fallback to Wandbox API for unavailable languages
6. Timeout & memory tracking

// Verdict Determination:
- AC: Exit code 0 + output matches expected
- WA: Exit code 0 + output mismatch
- TLE: Execution exceeds time limit
- RE: Non-zero exit code + non-compilation error
- CE: Compilation error detected
- MLE: Memory limit exceeded (tracked by OS)
```

### 2. Web Scraping (`sync.js`)
```javascript
// Two-tier scraping approach:
1. HTTP scraping (fast, no browser):
   - Cheerio for DOM parsing
   - User-Agent spoofing
   - Request timeout: 30 seconds
   - Retry logic with exponential backoff

2. Browser automation (for dynamic content):
   - Puppeteer for JavaScript-heavy sites
   - Headless browser in sandbox mode
   - Screenshot capability for verification
   - Session management

// Supported scrapers:
- Codeforces: Problem list, contests, user statistics
- CodeChef: Problems, contests
- AtCoder: Problems, contests
- LeetCode: Problem database (GraphQL endpoint)
- SPOJ: Classical problems, dynamic problem pool
- Project Euler: Math-based problem set
```

### 3. AI Integration
```javascript
// Groq API Integration:
- Model: llama-3.3-70b-versatile
- Rate limiting: 60 requests/minute per user
- Cache: LRU cache with 2-hour TTL (max 1000 entries)
- System prompt: Enforces no code solution rule
- Context window: Last 10 messages in conversation
- Fallback: Graceful degradation if API unavailable

// Cost Optimization:
- Cached responses avoid re-computation
- Prompt injection prevention
- Token count monitoring
```

### 4. Real-time Features (Socket.io)
```javascript
// Room-based architecture:
- Solve rooms: Collaborative code editing
- Chat rooms: Direct messaging
- Activity rooms: Friend activity streams

// Sync strategies:
- Operational Transformation for code sync (simple conflict resolution)
- Eventual consistency for chat
- Presence tracking for online status
```

### 5. Gamification Logic
```javascript
// XP Calculation:
baseXP = 10 + (rating - 800) / 100    // 10-150 XP range
comboMultiplier = min(2 + consecutiveSolves * 0.5, 5)  // 2-5x
speedBonus = timeSecs < 300 ? 1.5 : timeSecs < 900 ? 1.25 : 1
finalXP = baseXP * comboMultiplier * speedBonus

// Level Progression:
- XP accumulated across all submissions
- Next level requires exponential XP increase
- Achievements unlock at milestones
- Streaks reset after missed days (tracked via daily_activity)
```

---

## 📝 Environment Variables

```bash
NODE_ENV=development|production
PORT=3000
APP_URL=http://localhost:3000

# Database
DB_PATH=./tracker.db

# OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
CALLBACK_URL=http://localhost:3000/auth/callback

# AI
GROQ_API_KEY=xxx

# Session
SESSION_SECRET=xxx
SESSION_STORE_CLEANUP_INTERVAL=86400000

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🚀 Running the Application

### Installation
```bash
npm install
```

### Development
```bash
npm run dev                 # Node --watch with hot reload
npm run scrape              # Scrape 50 problems
npm run scrape:100          # Scrape 100 problems
npm run scrape:500          # Scrape 500 problems
npm run scrape:easy         # Scrape 200 easy problems (800-1200 rating)
npm run scrape:medium       # Scrape 200 medium problems
npm run scrape:hard         # Scrape 200 hard problems
```

### Production
```bash
npm run start:prod          # Production server
```

### Testing
```bash
npm test                    # Run smoke tests
```

---

## 🎨 Frontend Architecture

### Main Application States
```javascript
App = {
  // Problem solving state
  currentProblem,
  currentStatement,
  _solveTab,           // 'description', 'editorial', 'discuss'
  _bottomTab,          // 'testcases', 'submissions'
  
  // Gamification state
  _solveTimerInterval,
  _solveSecondsElapsed,
  _solveAttempts,
  _solveCombo,         // Consecutive solve count
  _baseXpReward,
  
  // Language selection
  _currentLang,        // 'cpp', 'python', 'java', etc.
  _langs,
  _langGroups,
  
  // Collaboration state
  _collabSocket,
  _collabRoom,
  _collabSuppressChange,
  
  // Social state
  _username,
  _socialSocket,
  _currentChatUser,
  _peerConnections,    // WebRTC connections
  _localStream,
  _onlineFriends,
  
  // Analytics & visualization
  charts,              // Chart.js instances
  _replayEvents,       // Code replay buffer
  
  // UI state
  _debugMode,
  _focusMode,
  _cmdFiltered,        // Command palette filtering
}
```

### Key Frontend Modules
1. **Problem Loading:** Scrape & cache problem statements from APIs
2. **Code Editor:** Monaco Editor integration with language switching
3. **Compilation/Execution:** AJAX calls to `/api/problems/:id/submit`
4. **Real-time Sync:** Socket.io listeners for code/chat updates
5. **Analytics:** Chart.js for visualizations, heatmap rendering
6. **Social Features:** Friends list, messaging UI, presence indicators
7. **Profile Management:** Avatar upload, settings, achievement showcase

---

## 🔐 Security Considerations

1. **Code Execution Sandbox:** Temp directory isolation, timeout limits
2. **SQL Injection Prevention:** Parameterized queries throughout
3. **XSS Prevention:** Content sanitization in user inputs
4. **CSRF Protection:** Session-based token validation
5. **Rate Limiting:** Per-endpoint rate limits (auth: strict, AI: moderate)
6. **CORS:** Configured for same-origin requests
7. **Helmet.js:** HTTP security headers (CSP, X-Frame-Options, etc.)
8. **OAuth Validation:** Provider token verification
9. **File Upload Restrictions:** Whitelist extension & size checks
10. **Admin Bypass:** Only designated admins can override XP/solves

---

## 🎯 Performance Optimizations

1. **Database:** WAL mode, connection pooling, indexed queries
2. **Caching:** AI response cache (LRU), problem statement cache
3. **Compression:** Gzip middleware on all responses
4. **CDN-Ready:** Static assets in `/public` served separately
5. **Code Execution:** Process pooling fallback to Wandbox
6. **Socket.io:** Room-based event broadcasting (efficient multicast)
7. **Frontend:** Lazy loading for problem lists, pagination (50 per page)
8. **Frontend:** Debounced code change events in collaboration

---

## 📈 Feature Roadmap Ideas

1. **Contests:** Create & participate in real-time contests
2. **Discussions:** Stack Overflow-style Q&A per problem
3. **Video Editorials:** Upload & comment on problem solutions
4. **Mentorship:** Pair programming sessions with streaks
5. **API:** Open API for third-party integrations
6. **Mobile App:** React Native for iOS/Android
7. **VSCode Extension:** Solve problems directly in VSCode
8. **Problem Recommendations:** ML-based personalized practice paths
9. **Company Interview Prep:** Company-specific problem sets
10. **Internship Tracker:** Application & interview status tracking

---

## 🔗 External Integrations

- **Groq API:** AI chat & code completion
- **GitHub OAuth:** User authentication
- **Google OAuth:** User authentication
- **Wandbox:** Remote code execution fallback
- **Web Scrapers:** Codeforces, CodeChef, AtCoder, LeetCode, SPOJ, Project Euler

---

## 📞 Support & Contributing

This is a personal project. For modifications, enhancements, or bug fixes, refer to the GitHub repository structure and follow the existing code patterns.

---

**Last Updated:** May 2026  
**Status:** Active Development (v2.0.0)
