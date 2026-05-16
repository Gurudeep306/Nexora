# Nexora - The Ultimate Competitive Programming Learning Platform

> A gamified, AI-powered competitive programming platform with real-time collaboration, skill progression, and comprehensive learning resources.

[![GitHub](https://img.shields.io/badge/GitHub-Nexora-blue?logo=github)](https://github.com/Gurudeep306/Nexora)
[![Node.js](https://img.shields.io/badge/Node.js-v14%2B-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 🚀 Features

### 📊 **Rift Level Progression System**
11-tier progression system with XP-based advancement from **Bit** (novice) to **∞ Overflow** (expert)
- XP rewards: 10-150 based on problem rating
- Combo multipliers: 2-5x for consecutive solves
- Speed bonuses: +50% for <5min, +25% for <15min solves

### 🎯 **80+ Integrated Problems**
Scrape and practice problems from 6 major platforms:
- **Codeforces** | **CodeChef** | **AtCoder** | **LeetCode** | **SPOJ** | **Project Euler**
- Advanced filtering: platform, rating (800-3500+), tags, status, search
- Pagination & sorting support
- Real-time problem statement caching

### 💻 **30+ Language Judge System**
Support for 30+ programming languages with verdicts: AC, WA, TLE, RE, CE, MLE
- C++, Python, Java, JavaScript, TypeScript, Go, Rust, Kotlin, Ruby, PHP, C#, Scala, Swift, Dart, Perl, Lua, Shell, R, PowerShell, Julia, F#, Clojure, Scheme, Objective-C, SQL, PostgreSQL, Pascal, VB, Elixir, Tcl

### 🌟 **Gamification & Achievements**
- **15+ Achievements** with unlock conditions
- Solve milestones (10, 50, 100, 500)
- Perfect solve bonus (first attempt)
- Time-based achievements (night owl, early bird)
- Streak milestones (3, 7, 30 days)
- Rating-based achievements (1000, 1400, 1800, 2100)

### 📈 **Advanced Analytics**
- **Dual Rating Charts** - Performance tracking over time
- **Heatmap Dashboard** - GitHub-style 365-day activity grid
- **Radar Chart** - Tag-based skill analysis
- **Verdict Distribution** - AC/WA/TLE breakdown
- **Weakness Analysis** - AI-powered recommendations for weak areas
- **Code Replay** - Record and playback your coding sessions

### 🤝 **Social & Collaboration**
- **Real-time Friends System** - Requests, accepts, unfriend functionality
- **Direct Messaging** - Real-time chat with typing indicators and read receipts
- **Solve Rooms** - Collaborative problem-solving with synchronized code
- **Voice Chat** - WebRTC-based peer-to-peer communication
- **Leaderboards** - Rank by XP, solved count, or streak
- **Activity Feeds** - Track friend progress

### 🧠 **Nexus Skill Tree**
- **50+ Skill Nodes** organized in 11 zones
- Prerequisite-based node unlock system
- Weekly problem pools with tag-based shuffling
- Zone gates with level unlock requirements
- Per-node completion tracking

### 📚 **Learning Resources**
- **Tutorials** - Categorized lessons with progress tracking
- **Learn System** - 30+ topics with curated problem paths
- **AI Lab** - Domain-specific problems (ML, DL, NLP, CV, GenAI, RL)
- **Forge Roadmap** - Software development career paths with milestones

### 🤖 **AI Integration**
- **AI Chat** - Context-aware tutoring without code answers
- **Code Completion** - Inline ghost-text suggestions
- **Error Detection** - Automatic syntax error repair
- **AI Battle** - 1v1 time-based racing against AI
- Powered by **Groq API** with LLaMA models

### 🎨 **Editor & IDE**
- **Monaco Editor** - Professional code editor with syntax highlighting
- **Zen Mode** - Minimize distractions with minimizable panels
- **Resizable Panels** - Draggable editor, problem, and test panels
- **Visual Debugger** - DBG_ARR/DBG_VAR macros for debugging output
- **Command Palette** - Cmd/Ctrl + K for quick actions
- **Customization** - Font size, tab size, word wrap, minimap, bracket coloring

### ⚙️ **Custom Features**
- **Workshop** - Create custom problems
- **Custom Contests** - Password-protected with participant scoring
- **Profile Customization** - Avatar upload, bio, display name
- **Settings** - Comprehensive user preferences

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite
- **Real-time:** Socket.io
- **Web Scraping:** Cheerio (HTTP), Puppeteer (Browser automation)
- **Authentication:** Passport.js (GitHub & Google OAuth)
- **AI:** Groq API (LLaMA models)
- **Session Management:** Express-session

### Frontend
- **Language:** Vanilla JavaScript
- **Editor:** Monaco Editor
- **Visualization:** Chart.js
- **Styling:** Custom CSS with design system
- **State Management:** Single App object pattern
- **Communication:** Socket.io (real-time), Fetch API

## 📋 Requirements

- Node.js v14 or higher
- npm or yarn
- SQLite3
- GitHub OAuth credentials (optional, for authentication)
- Google OAuth credentials (optional, for authentication)
- Groq API key (for AI features)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Gurudeep306/Nexora.git
cd Nexora
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
GROQ_API_KEY=your_groq_api_key_here
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 4. Initialize Database
```bash
npm run setup-db
```

### 5. Start the Server
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 📖 Usage

### Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

## 📚 Project Structure

```
nexora/
├── src/
│   ├── server.js              # Main Express server
│   ├── db.js                  # SQLite wrapper
│   ├── judge.js               # Code execution judge
│   ├── scraper.js             # Problem scraper
│   ├── sync.js                # Data synchronization
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   └── routes/
│       ├── auth.js            # Auth endpoints
│       ├── learning.js        # Learning resources
│       └── studio.js          # Editor/IDE endpoints
├── public/
│   ├── index.html             # Home page
│   ├── studio.html            # Code editor page
│   ├── css/
│   │   ├── styles.css         # Main styles
│   │   ├── effects.css        # UI effects
│   │   └── icons.css          # Icon styles
│   └── js/
│       ├── app.js             # Main application (10k+ lines)
│       ├── api.js             # API client
│       └── nexora-effects.js  # Visual effects
├── tests/
│   └── server-smoke.test.js   # Test suite
└── package.json
```

## 🔌 API Endpoints

### Problems (80+)
- `GET /api/problems` - Get filtered problems with pagination
- `GET /api/problems/:id` - Get problem details
- `POST /api/problem-statement/:id` - Scrape and cache problem

### Judge & Code Execution
- `POST /api/judge` - Compile, execute, and test code
- `POST /api/run` - Quick run without persistence
- `POST /api/testcases` - Manage test cases

### User Stats & Analytics
- `GET /api/stats` - Comprehensive user statistics (cached 3s)
- `GET /api/performance` - Advanced analytics data
- `GET /api/weakness` - Weak areas analysis

### Skill & Learning
- `GET /api/nexus/skills` - Skill tree with nodes
- `GET /api/tutorials` - Tutorial list with progress
- `GET /api/forge/paths` - Development roadmap paths

### Social Features
- `GET /api/friends` - Friend list
- `POST /api/friend-request` - Send/accept friend requests
- `GET /api/messages` - Direct messages with pagination
- `GET /api/leaderboard/:type` - Rankings (XP, solved, streak)

### Collaboration
- `POST /api/create-room` - Create solve room
- `GET /api/rooms` - Active rooms list
- `POST /api/room/messages` - Send room chat

### AI Integration
- `POST /api/ai-chat` - Context-aware tutoring
- `POST /api/ai-complete` - Code completion
- `POST /api/ai-fix` - Error detection and fixing

### User Management
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/profile/:username` - User profile lookup
- `POST /api/settings` - Settings CRUD

## 🗄️ Database Schema

**Core Tables:**
- `users` - User accounts with roles
- `problems` - Problem metadata
- `problem_statements` - Cached problem content
- `submissions` - Code submissions with verdicts
- `progress` - Problem-specific progress
- `achievements` - User achievement tracking
- `messages` - Direct messages
- `friends` - Friend relationships
- `solve_rooms` - Collaborative rooms
- `tutorials` - Tutorial lessons
- `tutorial_progress` - Tutorial tracking
- `forge_progress` - Roadmap milestones
- `settings` - User preferences
- `testcases` - Custom test cases
- `code_replays` - Coded session recordings

## ⚡ Performance

- **Scraping Speed:** <1s for HTTP, 2-3s for Puppeteer
- **Query Response:** <100ms for cached stats
- **Real-time Latency:** <50ms Socket.io events
- **Code Execution:** <5s for most problems

## 🔐 Security Features

- Password hashing with Scrypt + salt
- OAuth authentication (GitHub & Google)
- Session management with Express-session
- Input sanitization with HTML entity escaping
- Submission validation
- Rate limiting via caching

## 🎓 Learning Path

1. **Start:** Register and create your profile
2. **Explore:** Browse problems by platform and difficulty
3. **Practice:** Solve problems in the Monaco Editor
4. **Analyze:** Track progress with analytics dashboard
5. **Progress:** Advance through Rift levels
6. **Learn:** Use AI chat for hints and guidance
7. **Collaborate:** Join solve rooms and compete with friends
8. **Specialize:** Master specific domains via AI Lab

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support & Feedback

- Open an issue for bug reports
- Suggest features via GitHub Issues
- Reach out for questions or support

## 🌟 Acknowledgments

- Problem sources: Codeforces, CodeChef, AtCoder, LeetCode, SPOJ, Project Euler
- Built with modern web technologies and best practices
- Inspired by competitive programming communities

---

**Made with ❤️ by the Nexora team**

Start your competitive programming journey today! 🚀
