# Nexora API + Feature Catalog (contract for React rebuild)

Derived from: `src/server.js` (~5,700 ln), `src/routes/{auth,learning,studio,explainlab,forge,live}.js`, `src/middleware/auth.js`, `src/db.js`, `src/judge.js`, `src/explainlab-db.js`, `src/forge-db.js`, `src/live-db.js`, `public/js/{app.js,api.js,app.config.js}`, `public/index.html`, sub-app HTML.
Rule: unless stated otherwise, every response is JSON `{ ok: true, ... }` on success and `{ ok: false, error: string }` on failure. Exceptions are flagged.

---

## 1. Conventions

- **Base URL**: same origin (`''`). All API paths start with `/api/`. Client uses `fetch(..., { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })`. JSON body limit **2 MB**.
- **Auth mechanism**: express-session cookie, name **`nx.sid`** (httpOnly, sameSite lax). Logged-in = valid session containing `req.session.user` or `req.session.oauthUser`. Most "social/progress" endpoints are **not session-gated** — they take `username` as a param and trust it. Gated ones are marked **[auth]** (401 `{ok:false,error:'Authentication required'}` when missing).
- **Auth check on boot**: `GET /api/auth/status` → `{ok, authenticated:bool, user?}`. OAuth redirects land on `/?auth=github|google` or `/?auth_error=reason`.
- **Legacy identity**: the vanilla app also stores the username in `localStorage['cp_arena_username']` and sends it as a query/body param to social endpoints. The React app can keep session-only auth, but every endpoint below documents exactly what it expects.
- **Roles**: `role` column on `users`: `'member'` (default) | `'admin'` | `'teacher'` (teacher only used by live.js). Hardcoded admins: usernames `gurudeep`, `gurudeeppaidipati` get `role='admin'`, `xp_override=500000`, `solved_override=5000` on register.
- **Admin gate** `requireAdmin`: 403 `{ok:false,error:'Admin access required'}`.
- **Self-or-admin** `requireSelfOrAdmin(getTargetUsername)`: target taken from body param.
- **Studio gate** `createStudioAuth`: passes if header **`x-studio-token`** (or `?token=`) equals `process.env.STUDIO_PASSWORD` (default **`nexora-studio`**), OR session role is `admin`. Frontend caches the token in `localStorage['nx_tk']` and sends `x-studio-token` on every `/api/studio/*` call.
- **Rate limits**: global 300 req/min (production only); `authLimiter` 10/min (check-username, login, register); `judgeLimiter` 30/min (`/api/judge`, `/api/run`); `aiLimiter` 20/min (`/api/ai-chat`, `/api/ai-complete`, `/api/ai-fix`).
- **404s**: `/api/*` → `{ok:false,error:'API endpoint not found'}`; anything else serves `index.html` (SPA fallback).
- **Global error handler**: `{ok:false,error}` (+ `stack` in dev).
- **Verdicts** (judge): `AC | WA | TLE | RE | CE | OK` (quickRun success = `OK`).
- **Platforms**: `codeforces | codechef | atcoder | leetcode | spoj | euler`.
- **Dates**: DB stores SQLite text dates; API accepts `YYYY-MM-DD` (`/api/activity/:date`) and ISO strings. `start_time` for contests is sent as ISO string by the client.

---

## 2. API Reference

### 2.1 Auth & Users (`src/routes/auth.js` + server.js)

| Endpoint | Auth | Params | Response |
|---|---|---|---|
| `GET /api/auth/status` | – | – | `{ok, authenticated, user?{username,display_name,role,auth_provider,avatar,avatar_url,email}}` |
| `GET /api/auth/providers` | – | – | `{ok, github:bool, google:bool}` (env-configured) |
| `POST /api/auth/logout` | – | – | `{ok}` (destroys session) |
| `GET /auth/github`, `GET /auth/github/callback`, `GET /auth/google`, `GET /auth/google/callback` | – | – | OAuth flow; callback redirects to `/?auth=<provider>` or `/?auth_error=<reason>`. After OAuth the client must still `POST /api/user/register` to create the Nexora user. |
| `GET /api/user/check-username` | authLimiter | `?username` (2–20 chars `[a-zA-Z0-9_]`) | `{ok, available:bool}`; 400 on invalid chars |
| `POST /api/user/register` | authLimiter | body `{username, display_name?, avatar?, bio?, provider?, provider_id?, email?, avatar_url?, password?}` (password ≥4 chars, scrypt-hashed). Also used as **profile upsert**: if username exists it updates display_name/avatar/bio and re-persists session → `{ok,user,updated:true}` | `{ok, user, created:true}` |
| `POST /api/user/login` | authLimiter | `{username, password}` | `{ok,user}` / 404 `User not found` / 401 `Incorrect password`. **Gotcha:** password is only checked if `password_hash` is set — OAuth accounts "log in" with any password. |
| `PUT /api/user/profile` | [auth] + self/admin | `{currentUsername, newUsername?, displayName?, bio?, password?, currentPassword?, avatar?, avatarUrl?}` | `{ok, user, usernameChanged:bool}` (rename cascades to friendships/messages/activity_feed) |
| `POST /api/user/avatar` | [auth] + self/admin | `{username, image}` data-URL png/jpeg/webp ≤2 MB | `{ok, avatar_url:'/uploads/<username>_<ts>.<ext>'}` |
| `GET /api/user/profile/:username` | – | `?viewer` (for friend status) | `{ok, user (email/provider_id/password_hash removed), stats{solved,totalXp}, level(calcLevel obj), streak:number, friendStatus:'none'|'friends'|'pending_sent'|'pending_received', friendCount, activity(10 latest feed rows), memberSince}` |
| `GET /api/user/search` | – | `?q` (≥2 chars, LIMIT 20) | `{ok, users[{username,display_name,avatar,avatar_url,status,last_seen,role}]}` |
| `POST /api/admin/set-role` | [admin] | `{targetUser, role}` | `{ok}` |
| `GET /api/admin/users` | [admin] | – | `{ok, users}` (full users rows) |

`user` object shape (sanitized session): `{username, display_name, avatar (icon key, default 'coder'/'🧑‍💻' in DB), avatar_url, bio, status ('online'/'offline'), role, auth_provider, email, last_seen, created_at}`.

Avatar icon keys (frontend `_avatarIconMap`): `coder, fox, cat, wolf, sword, shield, trophy, diamond, fire, bolt, star, target, crown, robot, gamepad, brain, tree, globe, moon, dragon`.

### 2.2 Problems, Sync, Statements

| Endpoint | Auth | Params | Response |
|---|---|---|---|
| `POST /api/sync` | – | `{platform:'codeforces'|'codechef'|'atcoder'|'leetcode'|'spoj'|'euler'|'all'}` | `{ok, inserted, total}`. **The legacy app calls this with `'all'` on EVERY page load** — expensive; React should make it an explicit action. |
| `GET /api/problems` | – | `?platform, minRating, maxRating, tag, status(solved|attempted|unsolved), search, sort(rating|title|id), order(asc|desc), limit(def 50, max 200), offset` | `{ok, total, problems[{id,platform,problem_id,title,url,rating,tags(JSON string),category,solve_status,attempts,xp_earned,solved_at}], limit, offset}` |
| `GET /api/problems/:id` | – | `:id` = rowid | `{ok, problem(all cols + notes), testcases[{id,label,input,expected_output}], submissions(latest 20: {id,verdict,exec_time_ms,submitted_at})}` |
| `GET /api/problem-statement/:id` | – | – | `{ok, statement(HTML), inputSpec, outputSpec, note, timeLimit, memLimit, samples[{input,output}], platform, source:'local'|'cache'|'http'|'live'|'fallback'}` |
| `GET /api/scrape-stats` | – | – | `{ok, total, scraped, remaining, byPlatform[{platform,scraped,total}]}` |
| `GET /api/tags` | – | – | `{ok, tags[string]}` |
| `POST /api/translate` | – | `{html, targetLang}` | `{ok, translated, detectedLang:'auto'}` (Google gtx, 4500-char chunks) |
| `POST /api/testcases` | – | `{problem_rowid, label, input, expected_output}` | `{ok, id}` |
| `PUT /api/testcases/:id` | – | same body | `{ok}` |
| `DELETE /api/testcases/:id` | – | – | `{ok}` |

Testcases are **global per problem** (not per user). The solve view auto-imports scraped samples as testcases when the problem has none.

### 2.3 Judge & Run

| Endpoint | Auth | Params | Response |
|---|---|---|---|
| `POST /api/judge` | judgeLimiter | `{problem_id?, code, language, testcases:[{id?,label,input,expected_output}]}` | `{ok:true, verdict:'AC'|'WA'|'TLE'|'RE'|'CE', compileError:string|null, results:[{id,label,input,expected,actual,stderr,timeMs,verdict,passed}]}`. If `problem_id` present, side effects: submission row, progress upsert (status/attempts/xp_earned/solved_at), daily_activity upsert, achievement checks, cache invalidation. |
| `POST /api/run` | judgeLimiter | `{code, input, language}` | **Envelope exception — returns quickRun result directly**: `{ok:bool, verdict:'OK'|'CE'|'RE'|'TLE', output, stderr, timeMs}` or on compile error `{ok:false, verdict:'CE', error, output:'', stderr:''}` |
| `GET /api/languages` | – | – | **Envelope exception — bare array** `[{id, ext, compiled, label}, ...]` (28 langs from `LANG_CONFIG`) |

Execution: local runtimes first (clang++ C++20 `-O2`, cc C17, python3, javac/java, node, tsx, go, rustc, kotlinc, swiftc, mcs+mono, fpc, dart, pwsh, Rscript, scala, julia, dotnet fsi, clojure, guile, elixir, tclsh, ruby, php, perl, lua, bash); fallback to **Wandbox** remote API (concurrency 3) or **Kotlin Playground** for kotlin. Per-lang time limits: 5 s default; 10 s python/java/csharp/go/rust/ruby/php/r/swift/dart/elixir; 15 s kotlin/scala/julia. Output compare = per-line trimEnd + overall trim.

Frontend language list (32 langs, `window.NEXORA_APP_CONFIG.langs` in `public/js/app.config.js`) includes `typescript, powershell, fsharp, clojure, scheme, objectivec, vb, sql, pgsql, solidity` etc. that the judge may not support — each entry is `{g(group), id, label, badge, mono}`.

### 2.4 Bookmarks, Activity, Progress

| Endpoint | Auth | Params | Response |
|---|---|---|---|
| `GET /api/bookmarks` | – | `?username` | `{ok, problems(problem cols + bookmarked_at, solve_status, xp_earned), problemIds:[int]}` |
| `POST /api/bookmarks` | – | `{username, problemId}` | `{ok}` |
| `DELETE /api/bookmarks/:problemId` | – | `?username` | `{ok}` |
| `GET /api/activity/:date` | – | `:date` = `YYYY-MM-DD` (validated) | `{ok, date, stats{solved,attempted,xp}, submissions[{id,verdict,exec_time_ms,language,submitted_at,title,rating,platform,problem_id}]}` |
| `GET /api/settings` / `POST /api/settings` | – | POST body: flat `{key:value}` map (all values stored as strings; booleans are `"true"`/`"false"`) | `{ok, settings:{...}}` / `{ok}`. Known keys used by UI: `cf_handle, cc_handle, ac_handle, default_lang, font_size, tab_size, word_wrap, minimap, bracket_color, time_limit, auto_submit, compact_sidebar, show_xp, sound, ai_difficulty, ai_hints`. **Settings are global (single settings table), not per-user.** |
| `POST /api/reset-progress` | – | – | `{ok}` — wipes progress, submissions, daily_activity, code_replays, achievement unlocks |
| `POST /api/sync-solved` | – | – | `{ok, synced, total}` — imports solved list from Codeforces handle in `settings.cf_handle` |

### 2.5 Stats, Performance, Levels

`GET /api/stats?username` (3 s server cache) →
```
{ok, total, solved, attempted, totalXp, submissions, accuracy,
 ratingDist[{tier,count}]  // tiers: Newbie,Pupil,Specialist,Expert,Candidate Master,Master,Grandmaster
 platformDist[{platform,count}],
 streak{current,best,lastWeek[{date,solved}]},
 level, title, heatmap(365d)[{date,problems_solved,xp_earned}], recent(15),
 achievements[{id,title,description,icon,category,target,progress,xp_reward,unlocked_at}],
 verdicts[{verdict,count}], dailyChallenges(3), allTitles, todayStats{solved,attempted,xp}}
```
With `?username`, user's `xp_override`/`solved_override` replace totalXp/solved.

`level` (calcLevel) = `{level(1-11), xp, name, badge, color, glow, xpInLevel, xpForNext, probsInLevel, probsForNext, xpGated, probGated}`.
`title` (getPlayerTitle) = `{current{title,badge,min_xp,color,glow}, next{...min_problems}, xpToNext, probsToNext}`.
`allTitles` = `[{title,badge,min_xp,min_problems,color,glow}]` — **snake_case here**.
`dailyChallenges` = 3/day: easy (rating 800–1100, +25 bonus XP), medium (1200–1600, +50), hard (1700–2400, +100); rows `{id,date,problem_rowid,difficulty,bonus_xp,completed,completed_at, problem...}`.

**RIFT_LEVELS** (server constant; level requires BOTH xp AND minProblems):
1 Bit 0/0 · 2 Byte 800/100 · 3 Kilobyte 2000/220 · 4 Megabyte 4500/380 · 5 Gigabyte 9000/550 · 6 Terabyte 18000/750 · 7 Petabyte 34000/1000 · 8 Exabyte 62000/1350 · 9 Zettabyte 107000/1800 · 10 Yottabyte 180000/2500 · 11 ∞Overflow 310000/3500. Each has `{level,name,badge,color,glow,minR,maxR}` rating bands.

**XP per solve** (server `calcXp` by rating; duplicated in frontend `_initSolveHUD`): <1000→10, <1200→15, <1400→25, <1600→40, <1800→60, <2000→80, <2200→100, ≥2200→150.

`GET /api/performance` (3 s cache; **no username param — global progress**) → superset of stats:
```
{ok, total,solved,attempted,totalXp,submissions,accuracy, streak{...}, level,
 allTitles[{title,badge,minXp,minProblems,color,glow,level}]  // NOTE camelCase — differs from /api/stats!
 ratingDist, platformDist, verdicts, heatmap, recent(20 incl language,tags), todayStats,
 ratingClimb[{rating,date}], solveSpeed[{bracket,avgAttempts,count,avgMinutes}],
 langUsage[{language,count,acCount}], weeklyProgress[{week:'YYYY-Wnn',solved,xp,activeDays}],
 tagAnalysis[{tag,solved,attempted,total,solveRate,maxRating,avgRating}],
 recommendations[{tag,solveRate,problems(5)}],
 nextLevel:{level,name,color,xpNeeded,probsNeeded,daysEstimate}|null,
 avgDailyXp, avgDailySolves, consistencyScore(0-1, activeDays/30),
 hourDist[{hour,total,ac}], hardestSolved(5), mostAttempted(5),
 firstSolves[{bracket,firstDate,firstTitle}]}
```

`GET /api/roadmap` → `{ok, levels[{level,title,subtitle,minR,maxR,count:30,xpRequired,probsRequired,color,glow,problems(30),solvedCount,totalCount,completed,unlocked,progress}]}` (registered twice in server.js; first wins).

`GET /api/weakness-analysis` → `{ok, analysis[{tag,solved,attempted,total,solveRate,strength:'strong'(≥10 solved)|'moderate'(≥5)|'weak'}], recommendations[{tag,solveRate,problems(5)}]}`.

### 2.6 Nexus / Progression / Skill Tree

| Endpoint | Response |
|---|---|
| `GET /api/nexus` | `{ok, nodes[NEXUS_NODE + {solved,progress,unlocked,completed}], zones, player(calcLevel), riftLevels}`. Node: `{id,zone,name,icon,desc,tags,requires[],target,x,y,difficulty:[min,max],xpReward,resources[{title,url}]}`. Zone: `{level,name,color,glow,xpRequired,probsRequired,minR,maxR,unlocked:true,locked,completed,current,nodeCount,nodesCompleted,zoneProgress}` |
| `GET /api/level-roadmap` | `{ok, levels[{level,name,color,glow,minR,maxR,xpRequired,probsRequired,unlocked:true,current,topics[{name,desc,tags,problems,totalPool,solvedInPool}],totalProblems,solvedCount,progress}], player, weekSeed}` — weekly seeded shuffle (`weekSeed = floor(now/7d)`); level 11 floor 2200, no ceiling |
| `GET /api/skill-tree` | `{ok, nodes, tierNames[], tierColors[]}` |
| `GET /api/skill-tree/:nodeId/problems` | `{ok, problems(50, unsolved-first then rating asc), skill{...node, solvedCount, totalAvailable}}` |

### 2.7 AI Battle, Decomposition, Code Replay

| Endpoint | Params | Response |
|---|---|---|
| `POST /api/ai-battle/start` | `{problem_id}` | `{ok, battleId, aiTimeMs, rating}` — aiTime = rating-band base × random 0.7–1.3 |
| `POST /api/ai-battle/complete` | `{battleId, playerTimeMs, won}` | `{ok}` |
| `GET /api/ai-battles/:problemId` | – | `{ok, battles(latest 10), wins, total}` |
| `GET /api/decomposition/:problemId` | – | `{ok, note:{approach,brute_force,optimization,data_structures,edge_cases}}` (or empty note) |
| `POST /api/decomposition` | `{problem_id, approach, brute_force, optimization, data_structures, edge_cases}` | `{ok}` (upsert; UI auto-saves with 1 s debounce) |
| `POST /api/code-replay` | `{submission_id, events, duration_ms}` | `{ok}`. Events = Monaco change deltas `{t(ms since start), changes:[{range:{startLineNumber,startColumn,endLineNumber,endColumn}, text}]}`, capped 2000 |
| `GET /api/code-replay/:submissionId` | – | `{ok, replay{...,events(parsed)}}` or **HTTP 200** `{ok:false,error:'No replay'}` |

### 2.8 Custom Problems (Workshop)

| Endpoint | Params | Response |
|---|---|---|
| `GET /api/custom-problems` | – | `{ok, problems[{id,creator,title,statement,input_spec,output_spec,difficulty,tags(JSON str),samples(JSON str),testcases(JSON str),time_limit,memory_limit,created_at,updated_at}]}` |
| `GET /api/custom-problems/:id` | – | `{ok, problem}` |
| `POST /api/custom-problems` | `{title, statement, input_spec, output_spec, difficulty(def 1000), tags[], samples[{input,output}], testcases[{input,expected_output}], time_limit('2 seconds'), memory_limit('256 MB')}` — `creator` included | `{ok, id}` |
| `PUT /api/custom-problems/:id` | same | `{ok}` |
| `DELETE /api/custom-problems/:id` | – | `{ok}` |
| `GET /api/workshop/stats?username` | – | `{ok, totalCustom, totalContests}` |

### 2.9 Social: Friends, Messages, Rooms, Feed, Leaderboard

| Endpoint | Params | Response |
|---|---|---|
| `GET /api/friends/:username` | – | `{ok, friends[{username,display_name,avatar,status,last_seen,friends_since}]}` |
| `GET /api/friends/:username/requests` | – | `{ok, incoming[{id,from_user,...}], outgoing[]}` |
| `POST /api/friends/request` | `{from, to}` | `{ok}` or **HTTP 200** `{ok:false,error:'Already friends'|'Request already pending'}` |
| `POST /api/friends/accept` / `POST /api/friends/reject` | `{id}` (friendship rowid) | `{ok}` |
| `DELETE /api/friends/:id` | – | `{ok}` |
| `GET /api/messages/:user1/:user2` | – | `{ok, messages(200, asc){id,from_user,to_user,content,read,created_at,reactions?}}` — **side effect: marks incoming as read** |
| `POST /api/messages` | `{from, to, content}` (truncated 2000) | `{ok, message}` |
| `GET /api/messages/unread/:username` | – | `{ok, counts[{from_user,count}], total}` |
| `POST /api/messages/:id/react` | `{username, emoji}` toggle | `{ok, reactions:{emoji:[usernames]}}` — **in-memory only, lost on restart** |
| `GET /api/messages/:id/reactions` | – | `{ok, reactions}` |
| `GET /api/rooms` | – | `{ok, rooms(50 open){id(6-char upper),name,creator,creator_name,creator_avatar,problem_id,problem_title,problem_rating,problem_platform,max_members,is_voice,status,created_at,member_count(in-memory)}}` |
| `POST /api/rooms` | `{name(≤50), creator, problem_id, is_voice, max_members(def 5)}` | `{ok, room}` |
| `GET /api/rooms/:id` | – | `{ok, room(+members[username])}` |
| `DELETE /api/rooms/:id` | – | `{ok}` (status→closed) |
| `GET /api/rooms/:id/messages` | – | `{ok, messages(200){...,display_name,avatar}}` |
| `GET /api/feed/:username` | – | `{ok, feed(50, self + accepted friends){username,type,content,problem_id,created_at,display_name,avatar,problem_title,problem_rating,problem_platform}}` |
| `GET /api/leaderboard` | `?type=xp|solved|streak&limit(def 25,max 100)` | `{ok, leaderboard[{username,display_name,avatar,avatar_url,role,created_at,total_xp,total_solved(,best_streak)}], type}` — **uses ONLY `xp_override`/`solved_override` columns, not real progress**; `streak` type sorts by solved_override as fake best_streak |

### 2.10 Contests

Two different things share the prefix:
- `GET /api/contests` → **live scrape** of Codeforces+CodeChef: `{ok, contests[{platform,name,url,startTime(ms),durationSeconds,phase:'RUNNING'|'CODING'|'BEFORE'|'PENDING'|'FINISHED'}]}` sorted RUNNING→BEFORE→FINISHED.
- Custom (user-hosted) contests:

| Endpoint | Params | Response |
|---|---|---|
| `POST /api/contests/create` | `{creator, title, description, type:'speed'|'accuracy'|'quiz', password(≥4, sha256(pass+"nexora_salt")), org_tag, start_time(ISO), duration_mins(def 60), problems:[customProblemIds], max_participants(def 50)}` | `{ok, contest_id, contest_code}` (code `'NX-'+6 chars` from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, client-generated & sent OR server default) |
| `GET /api/contests/mine?username` | – | `{ok, contests(+participant_count)}` |
| `POST /api/contests/join` | `{username, contest_code(uppercased server-side), password}` | `{ok, contest(no password_hash), participant_count}` / 404 / 401 `Wrong password` / 400 full |
| `GET /api/contests/:id?username` | – | `{ok, contest, participants[{username,score,joined_at}], isOwner}` / 403 `Not enrolled` |
| `DELETE /api/contests/:id` | `{username}` in body | `{ok}` / 403 |

### 2.11 AI Tutor (`src/routes/learning.js`, aiLimiter)

| Endpoint | Params | Response |
|---|---|---|
| `POST /api/ai-chat` | `{statement, question, history:[{role,content}]}` (last 10 used) | `{ok, reply}` (Groq `llama-3.3-70b-versatile`, strict no-code tutor prompt) / 500 if `GROQ_API_KEY` missing |
| `POST /api/ai-complete` | `{prefix, suffix, language}` | `{ok, text}` (Gemini 2.0 Flash Lite primary, Groq fallback; 90 s in-memory cache max 300). **On error returns HTTP 200 `{ok:false, text:''}`** |
| `POST /api/ai-fix` | `{code, language, error}` | `{ok, code}` or `{ok:false,error}` (`NO_FIX` → `'AI could not safely fix this code'`) |

### 2.12 AI Lab problems & Tutorials (learning.js)

| Endpoint | Response |
|---|---|
| `GET /api/ai-problems?category` (def `all`) | `{ok, problems[{id,category(ml|dl|nlp|cv|genai|rl),title,description,difficulty(beginner|intermediate|advanced),tags(JSON str),starter_code,solution_approach,hints(JSON str),resources(JSON str),input_format,output_format,constraints,samples(JSON str),created_at,status,progress}]}` |
| `GET /api/ai-problems/:id` | `{ok, problem(+progress|null)}` |
| `POST /api/ai-problems/:id/progress` | body `{status:'solved'|'in-progress'|'unsolved', notes}` → `{ok}` |
| `GET /api/ai-stats` | `{ok, total, solved, inProgress, byCategory[{category,total,solved}]}` |
| `GET /api/tutorials?category` | `{ok, tutorials[{id,category,topic,title,description,content,difficulty,order_index,estimated_time,prerequisites,code_examples,completed(0|1)}]}` |
| `GET /api/tutorials/:id` | `{ok, tutorial}` |
| `POST /api/tutorials/:id/complete` | `{ok}` |
| `GET /api/tutorial-stats` | `{ok, total, completed, byCategory}` |
| `GET /api/tutorial-problems/:topic` | `{ok, problems(30, mapped by TOPIC_TAG_MAP, rating asc)}` |
| `GET /api/dashboard-layout` / `POST /api/dashboard-layout` | `{ok, layout}` / `{ok}` — layout = `{_order:[sectionKeys], <sectionKey>:bool(visible)}` stored in settings key `dashboard_layout`. **Global, not per-user.** |

### 2.13 Forge learning roadmap (learning.js — PUBLIC, mounted before forge.js builder)

| Endpoint | Response |
|---|---|
| `GET /api/forge/paths` | `{ok, paths[{id,title,description,color,milestones[{title,topics[{id,title,desc,difficulty,time,status}]}],totalTopics,completedTopics,inProgressTopics,progress}]}` (static dev-roadmap data + `forge_progress` statuses) |
| `GET /api/forge/path/:id` | `{ok, path}` |
| `POST /api/forge/topic/:id/status` | body `{status:'not-started'|'in-progress'|'completed', pathId}` → `{ok}` |
| `GET /api/forge/stats` | `{ok, total, completed, inProgress}` |

### 2.14 Forge page builder (forge.js — admin-only writes; separate DB `forge-db.js`)

⚠ Prefix collision with 2.13. Also **BUG**: `PUT /pages/:id` and `DELETE /pages/:id` are registered with the full path inside the router → real URLs are `/api/forge/api/forge/pages/:id` (broken).

| Endpoint | Auth | Response |
|---|---|---|
| `GET /api/forge/overview` | admin | `{ok, stats{pages,components,models,apis,forms,workflows,publishedPages,draftPages}}` |
| `GET /api/forge/pages?status&limit(50)&offset` | admin | `{ok, pages, total}` |
| `GET /api/forge/pages/:id` | admin | `{ok, page(schema_json/css_json PARSED), versions(latest 10)}` |
| `POST /api/forge/pages` | admin | `{title,route,description,layout_type,schema_json,css_json}` → `{ok,id}` / 400 `Route already exists` |
| `POST /api/forge/pages/:id/publish` / `/unpublish` | admin | `{ok}` |
| `GET /api/forge/pages/:id/versions` / `POST .../rollback/:versionId` | admin | `{ok,versions}` / `{ok}` |
| `GET /api/forge/components` | **public** | `{ok, components}` |
| `POST /api/forge/components` | admin | `{name,type,category,description,props_schema,default_styles}` → `{ok,id}` |
| `GET/POST /api/forge/models` | GET public / POST admin | model `{name,slug,description,fields_json,permissions_json}` |
| `GET/POST /api/forge/forms` | GET public / POST admin | `{name,slug,fields_json,submit_action,success_message,redirect_url}` |
| `GET/POST /api/forge/workflows`, `POST /workflows/:id/enable|disable` | GET public / POST admin | `{name,description,trigger_type,trigger_config_json,conditions_json,actions_json}` |
| `GET/POST /api/forge/navigation` | GET public / POST admin | `{name, location:'sidebar', items_json}` |
| `GET/POST /api/forge/themes`, `POST /themes/:id/activate` | GET public / POST admin | `{name,colors_json,typography_json,spacing_json,components_json}` |
| `GET/PUT /api/forge/settings` | GET public / PUT admin | `{ok, settings{key:value}}` (booleans coerced) |
| `POST /api/forge/health/check` | admin | `{ok, healthy, issues, warnings, summary{totalIssues,totalWarnings,errorCount}}` |

### 2.15 Studio CMS (studio.js — all `/api/studio/*` need studio token or admin session; `/api/cms/*` public)

| Endpoint | Params | Response |
|---|---|---|
| `POST /api/studio/upload` | multipart field `file` ≤50 MB (jpg/jpeg/png/gif/webp/mp4/webm/mov/pdf/svg) | `{ok, url:'/uploads/studio/<file>', name, size}` |
| `GET /api/studio/courses` | – | `{ok, courses[{id,slug,title,description,icon,color,section,order_idx,published,created_at,chapters[{...,lessons[...]}]}]}` |
| `POST /api/studio/courses` | `{title,description,icon,color,section,order_idx}` | `{ok, id, slug}` |
| `PUT /api/studio/courses/:id` | partial incl `published` (COALESCE) | `{ok}` |
| `DELETE /api/studio/courses/:id` | – | `{ok}` |
| `POST /api/studio/chapters` | `{course_id,title,...}` | `{ok, id, slug}` |
| `PUT/DELETE /api/studio/chapters/:id` | – | `{ok}` |
| `GET /api/studio/lessons/:id` | – | `{ok, lesson(+linked_problems[{id,order_idx,problem_id,title,rating,platform,tags,custom_problem_id,cp_title,cp_rating}])}` |
| `POST /api/studio/lessons` | `{chapter_id,title,content,duration_min,order_idx}` | `{ok, id, slug}` |
| `PUT/DELETE /api/studio/lessons/:id` | – | `{ok}` |
| `POST /api/studio/lessons/:id/problems` | `{problem_id | custom_problem_id, order_idx}` | `{ok, id}` |
| `DELETE /api/studio/lessons/:lessonId/problems/:linkId` | – | `{ok}` |
| `POST /api/studio/create-problem` | `{title,statement,input_spec,output_spec,difficulty(def 1200),tags,time_limit,memory_limit,samples,testcases}` | `{ok, id}` |
| `GET /api/cms/courses?section` | **public**, published only | `{ok, courses}` (nested chapters/lessons) |
| `GET /api/cms/lessons/:id` | **public**, published only | `{ok, lesson(+linked_problems incl url)}` |
| `POST /api/studio/reorder` | `{type:'course'|'chapter'|'lesson', items:[{id,order_idx}]}` | `{ok}` |
| `GET /api/studio/search-problems?q&type=all|platform|custom` | – | `{ok, results}` |
| `GET /api/studio/media-list` | – | `{ok, files[{name,url}]}` |
| `GET/POST /api/studio/notes` | `{title,content,color(def '#8400ff')}` | `{ok,notes}` / `{ok,id}` |
| `PUT/DELETE /api/studio/notes/:id` | – | `{ok}` |
| `GET /api/studio/doubts` | seeds 2 examples if empty | `{ok, doubts[{id,question,student_name,source,status,answer,created_at}]}` |
| `POST /api/studio/doubts` / `PUT /:id {answer,status}` / `DELETE /:id` | – | `{ok}` |
| `GET /api/studio/tutorials` | – | `{ok, grouped(by category), total}` |
| `GET/PUT/POST/DELETE /api/studio/tutorials/:id` | – | `{ok,...}` |
| `GET /api/studio/ai-problems-list` | – | `{ok, grouped, total}` |
| `GET/PUT/DELETE /api/studio/ai-problems/:id`, `POST /api/studio/ai-problems-new` | – | `{ok,...}` |
| `GET /api/studio/forge` | – | `{ok, paths(topics incl has_override)}` |
| `GET /api/studio/forge/:topicId` | – | `{ok, override|null, static|null}` |
| `PUT /api/studio/forge/:topicId` | `{path_id,title,description,content_html,difficulty,time_estimate}` | `{ok}` |
| `GET /api/studio/all-problems?q&limit(60,max200)&offset` | – | `{ok, problems(+statement fields), total}` |
| `PUT /api/studio/platform-problems/:id` | – | `{ok}` |
| `GET /api/studio/custom-problems-list?q` | – | `{ok, problems}` |
| `GET/PUT /api/studio/custom-problems/:id` | – | `{ok,...}` |
| `POST /api/studio/run-code` | `{language, code, stdin}` — Piston (emkc.org), 15 s timeout, 22 langs | `{ok, output, stderr, exitCode}` or `{ok:false,error}` |
| `POST /api/studio/ai-assist` | `{prompt, type:'problem'|'tutorial'|'hints'|'description'|'improve'}` | `{ok, text}` (Groq) |
| `GET /studio` | – | serves `studio.html` |

### 2.16 ExplainLab (explainlab.js — session-authenticated; DB `explainlab-db.js`)

Pages: `GET /explainlab` (builder, `explainlab.html`), `GET /explainlab/view/:id` (viewer, `explainlab-viewer.html`), `GET /explainlab/dashboard` → **references `explainlab-dashboard.html` which DOES NOT EXIST in public/** (will 500/error).

Writes use `requireAuthenticatedUser` (session user = `req.sessionUser`). Draft reads use a **buggy check**: `if (user.username !== session.teacher_id || user.role !== 'admin') → 403` — with `||`, non-admin owners are locked out of their own drafts; effectively only admins can read drafts.

| Endpoint | Params | Response |
|---|---|---|
| `POST /api/explainlab/sessions` | `{course_id?, chapter_id?, lesson_id?, problem_id?, custom_problem_id?, title(required), description?, explanation_type?, level?, language?}` | `{ok, session, initialPageId}` (first page auto-created) |
| `GET /api/explainlab/sessions` | `?teacher_id, course_id, chapter_id, lesson_id, problem_id, status(def 'published'), search, limit(def 50; 20 when search), offset` | `{ok, sessions, total, ...}` |
| `GET /api/explainlab/sessions/:id` | – | `{ok, session(+pages[], markers[], clips[])}` — full `explain_sessions` row: `{id,teacher_id,course_id,chapter_id,lesson_id,problem_id,custom_problem_id,title,description,explanation_type,level,language,status:'draft'|'published',duration_ms,thumbnail_url,video_url,audio_url,final_board_snapshot_url,typed_notes_html,full_explanation_html,allow_downloads,allow_public_doubts,created_at,updated_at,published_at}` |
| `PUT /api/explainlab/sessions/:id` | partial | `{ok}` (owner/admin) |
| `POST /api/explainlab/sessions/:id/publish`, `DELETE /api/explainlab/sessions/:id` | – | `{ok}` |
| `GET/PUT /api/explainlab/sessions/:id/typed-notes` | PUT `{html}` | `{ok, html}` / `{ok}` |
| `GET/PUT /api/explainlab/sessions/:id/full-explanation` | PUT `{html}` | same |
| `GET/POST /api/explainlab/sessions/:id/pages` | `{title, background_type, background_data, is_handwritten_note}` | `{ok,pages}` / `{ok,pageId}` |
| `PUT/DELETE /api/explainlab/pages/:pageId` | – | `{ok}` |
| `POST /api/explainlab/sessions/:id/events` | `{page_id, timestamp_ms, event_type, payload_json}` | `{ok, eventId}` |
| `POST .../events/bulk` | `{events:[...]}` | `{ok, count}` |
| `GET .../events?start_time&end_time&page_id` | – | `{ok, events}` (`payload` parsed, `payload_json` removed) |
| `POST/GET .../code-events` | `{timestamp_ms, language, event_type, payload_json}` | `{ok,...}` |
| `GET/POST .../handwritten-notes` | `{title, file_url, file_type, source_type}` | `{ok,notes}` / `{ok,noteId}` |
| `DELETE /api/explainlab/handwritten-notes/:noteId` | – | `{ok}` |
| `GET/POST .../markers` | `{timestamp_ms, title, description, marker_type(def 'chapter')}` | `{ok,markers}` / `{ok,markerId}` |
| `DELETE /api/explainlab/markers/:markerId` | – | `{ok}` |
| `GET/POST .../clips` | `{title, start_ms, end_ms, description}` | `{ok,clips}` / `{ok,clipId}` |
| `DELETE /api/explainlab/clips/:clipId` | – | `{ok}` |
| `GET/POST .../notes` (student notes) | `{timestamp_ms, page_id, note_text, visibility(def 'private')}` | `{ok,notes}` / `{ok,noteId}` |
| `DELETE /api/explainlab/notes/:noteId` | – | `{ok}` |
| `GET/POST .../bookmarks` | `{timestamp_ms, label}` | `{ok,bookmarks}` / `{ok,bookmarkId}` |
| `DELETE /api/explainlab/bookmarks/:bookmarkId` | – | `{ok}` |
| `GET .../doubts` | teacher sees all + `replies[]`; students see own | `{ok, doubts[{...,x,y,doubt_text,status:'open'|'resolved',replies}]}` |
| `POST .../doubts` | `{page_id, timestamp_ms, x, y, doubt_text}` | `{ok, doubtId}` (blocked if `!allow_public_doubts` and not teacher) |
| `POST /api/explainlab/doubts/:doubtId/reply` | `{reply_text, reply_type, payload_json}` | `{ok, replyId}` |
| `PUT /api/explainlab/doubts/:doubtId/resolve` | – | `{ok}` |
| `GET/POST .../progress` | POST `{last_position_ms?, completed?, watch_time_ms?}` | `{ok, progress|null}` / `{ok}` |
| `GET .../analytics` | teacher/admin | `{ok, analytics}` |
| `POST .../analytics` | event body; **no auth middleware** (uses `req.sessionUser?.username`) | `{ok}` |
| `POST .../upload-media` | – | always `{ok:false, error:'Use /api/studio/upload for media uploads'}` |
| `POST .../ai/summary` | [auth] | `{ok, summary}` |
| `POST .../ai/notes` | [auth] | `{ok, notes_html}` |
| `POST .../ai/full-explanation` | [auth] | `{ok, explanation_html}` |
| `POST .../ai/quiz` | [auth] | `{ok, quiz:[{question, options[4], correctIndex, explanation}]}` |
| `POST .../ai/flashcards` | [auth] | `{ok, flashcards:[{front, back}]}` |
| `GET /api/explainlab/teacher/sessions?status` | [auth] | `{ok, ...sessions result}` |

### 2.17 Live Classes (live.js — DB `live-db.js`; ⚠ MOSTLY BROKEN)

`isTeacher` = session role `admin` or `teacher`. **BUG: `POST /classes`, `PUT /classes/:id`, `POST /classes/:id/start|end|join|leave`, `POST /classes/:id/messages`, `POST /classes/:id/publish-recording` call functions that were never imported (`createLiveClass`, etc.) → runtime ReferenceError → HTTP 500.** Working endpoints:

| Endpoint | Response |
|---|---|
| `GET /api/live/classes?status&limit(50)&offset` | `{ok, classes(+participant_count), total}` — row: `{id,title,description,teacher_id,status,scheduled_start,scheduled_end,...}` |
| `GET /api/live/classes/:id` | `{ok, class, participants, recordings(status 'ready'), isTeacher, isParticipant}` |
| `DELETE /api/live/classes/:id` | teacher/admin | `{ok}` |
| `GET /api/live/classes/:id/participants` | `{ok, participants}` |
| `GET /api/live/classes/:id/messages?limit&offset` | `{ok, messages}` |
| `GET/POST /api/live/classes/:id/recordings` | POST `{recording_type, file_url, duration_ms, metadata}` → `{ok, id}` |
| `POST /api/live/classes/:id/invite` | `{user_id | email}` → `{ok, id}` |
| `GET /api/live/classes/:id/attendance` | teacher → `{ok, attendance[{user_id,user_name,role,joined_at,left_at,attendance_seconds,mic_enabled,camera_enabled,hand_raised}], summary{totalParticipants,totalAttendanceSeconds,avgAttendanceSeconds}}` |

The live-class.html UI does **not** use these REST endpoints at runtime — it uses Socket.io events `live:*` which the server **never registers** (see §3). The live-class feature is effectively non-functional end-to-end.

### 2.18 Misc

| Endpoint | Response |
|---|---|
| `GET /api/health` | `{ok, uptime, timestamp, version, env}` |

---

## 3. Socket.io Events

Config: `pingInterval 25000`, `pingTimeout 60000`, CORS credentials enabled. Client connects to same origin (`io()`), emits `register-user` after connect. Solve-room sockets join room `solve-${roomId}`; legacy rooms use raw `roomId`.

### Client → Server
| Event | Payload | Purpose |
|---|---|---|
| `register-user` | `{username}` | mark online, join personal room |
| `direct-message` | `{from, to, content}` | DM relay (server also persists via REST) |
| `join-solve-room` / `leave-solve-room` | `{roomId, username}` | co-op solve rooms |
| `room-chat` | `{roomId, username, content}` | room chat |
| `room-code-change` | `{roomId, code, username}` | collaborative editor sync |
| `voice-join` / `voice-leave` | `{roomId, username}` | voice channel presence |
| `voice-offer` / `voice-answer` / `voice-ice-candidate` | `{to, offer|answer|candidate, from}` | WebRTC signaling |
| `voice-speaking` | `{roomId, username, speaking}` | speaking indicator |
| `typing-start` / `typing-stop` | `{from, to}` | typing indicator |
| `mark-messages-read` | `{from, to}` | read receipts |
| `challenge-friend` | `{from, to, problemId, problemTitle}` | 1v1 challenge invite |
| `notify-friend-request` | `{to, from}` | friend request ping |
| legacy: `create-room` | `{problemId, code}` | old room flow |
| legacy: `join-room` / `code-change` / `cursor-move` | `{roomId}` / `{roomId,code}` / `{roomId,position}` | old collab |

### Server → Client
| Event | Payload |
|---|---|
| `user-online` / `user-offline` | `{username}` |
| `new-message` | `{message}` (to recipient) |
| `message-sent` | `{message}` (confirmation to sender) |
| `social-error` | `{error}` |
| `room-members-updated` | `{roomId, members:[usernames]}` |
| `room-chat-message` | `{roomId, username, content, display_name, avatar, created_at}` |
| `room-code-update` | `{code, username}` |
| `voice-user-joined` | `{username, socketId}` |
| `voice-user-left` | `{username}` |
| `voice-offer` | `{from(socketId), offer, fromUsername}` |
| `voice-answer` | `{from, answer}` |
| `voice-ice-candidate` | `{from, candidate}` |
| `user-typing` / `user-stopped-typing` | `{from}` |
| `messages-read` | `{by}` |
| `voice-speaking-update` | `{username, speaking}` |
| `challenge-received` | `{from, problemId, problemTitle}` |
| `friend-request-received` | `{from}` |
| legacy: `room-created` `{roomId}` · `room-error` `{error}` · `room-joined` `{roomId,code,problem}` · `user-count` `{count}` · `code-update` `{code}` · `cursor-update` `{userId,position}` |

**NOT handled by the server** (emitted by live-class.html only, dead): `live:join-room`, `live:leave-room`, `live:raise-hand`, `live:chat-message`, `live:recording-started`, `live:recording-stopped`; and its listeners `live:participant-joined/left`, `live:class-ended`.

---

## 4. Page Inventory (hash router, `public/js/app.js` lines 630–748)

Shell (`public/index.html`): boot screen (~2.8 s animation) → OrbitDock sidebar (nav from `js/layout/sidebar-config.js`, groups: HQ/Code/Learn+AI/Community/Tools) + hidden legacy sidebar kept for the player card. `#mainContent > #pageContent` receives each page. Global overlays in index.html: **solve overlay**, **AI-lab solve overlay**, settings overlay, command palette (`⌘K`), shortcuts overlay, achievement popup, contest detail overlay, social chat sidebar, collab indicator, AI race overlay.

Init flow: boot → `_initSocial()` (socket) → `_loadAndApplySettings()` (`GET /api/settings`) → handle `?auth=`/`?auth_error=` → `GET /api/auth/status` else `localStorage['cp_arena_username']` → if no username show **gate screen** (login/register) → admin check via `GET /api/user/profile/:username` → default route `#/hub` → `_autoSync()` **POSTs `/api/sync {platform:'all'}` on every page load**.

localStorage keys (only two): `cp_arena_username`, `nexora_sidebar_collapsed`. Studio sub-app adds `nx_tk`.

### Routes
| Hash | Renderer | Content & endpoints |
|---|---|---|
| `#/hub`, `#/dashboard` | `renderHub` | "NEXORA HQ". Header actions: settings, sync (`POST /api/sync-solved`), layout customize. Body = customizable dashboard: sections `quickactions, today, challenges, recent, momentum, stats, streak, analytics, activity(heatmap), charts(rating+verdict doughnuts), skillradar, battlelog, insights` — order/visibility from `GET /api/dashboard-layout` (`_order`, per-key booleans), saved via `POST /api/dashboard-layout` (customize panel). Data: `GET /api/stats?username` + `GET /api/performance` in parallel; heatmap cell click → `GET /api/activity/:date`. Computes client-side "power level" = `solved*10 + totalXp*0.1 + streak*50 + accuracy*5 + consistencyScore*3`. Chart.js 4.4 used throughout. |
| `#/analytics`, `#/performance` | `renderHub` → perf tab | Same data via `/api/performance`; rating climb line, weekly bars, lang usage, hour distribution, tag radar. |
| (hub profile tab) | `_renderHubProfile` | Hero (avatar+rift badge, level tag), rank progression track over `allTitles` (uses `min_xp/min_problems`), achievements grid, platform doughnut, stat rows. `GET /api/stats`, `GET /api/settings`, `GET /api/user/profile/:me`. |
| `#/problems` | `renderProblems` | Filter bar (search debounce 300 ms, platform, min/max rating, status), sortable table (title/rating), pagination (limit 50). `GET /api/problems`, `GET /api/bookmarks` (star toggles → `POST/DELETE /api/bookmarks`). Row click → `App.openSolve(id)` (overlay, **no hash route**). |
| `#/bookmarks` | `renderBookmarks` | Saved-problems table; `GET /api/bookmarks?username`. |
| `#/contests` | `renderContests` | Live/upcoming CF+CC contests, tabs all/live/queue/past filtering `phase`; `GET /api/contests`. Cards link out to platform URL. |
| `#/nexus`, `#/skills`, `#/submissions`, `#/achievements` | `renderNexus` | "Nexora Progression". Tabs `/zones` + `/perf`. Zones: `GET /api/nexus` + `GET /api/level-roadmap` merged per level — zone accordion (locked banner shows XP/problem requirements), skill nodes, weekly practice problems per topic; week-refresh countdown from `weekSeed`. Node click → side panel with prereqs, resources, `GET /api/skill-tree/:nodeId/problems` (first 12). `/perf` tab → `GET /api/performance` analytics. |
| `#/ailab`, `#/ailab/:id` | `renderAILab` / `_openAiProblemPage` | AI/ML practice problems (categories all/ml/dl/nlp/cv/genai/rl). `GET /api/ai-stats`, `GET /api/ai-problems?category`. `:id` opens **full-screen AI-lab solve overlay** (separate Monaco instance, Python-only): problem panel (description, hints, resources, samples), bottom panel tabs `stdin/stdout/test/`; Run → `POST /api/run` with custom input, then per-sample runs; "solved!" → `POST /api/ai-problems/:id/progress {status:'solved'}`. |
| `#/learn`, `#/learn/:subject`, `#/learn/:subject/:id`, `#/learn/:id` | `renderLearn` / `renderLearnTopics` / `_openTutorialPage` | Subject grid grouped: DSA / AI-ML / GATE / Languages / System Design / More (client-side `_learnSubjects` catalog). Topics: `GET /api/tutorials?all` filtered by subject category/topic. Tutorial page: rendered `content`, code examples, practice problems via `GET /api/tutorial-problems/:topic`, mark complete `POST /api/tutorials/:id/complete`. Stats bar `GET /api/tutorial-stats`. |
| `#/forge`, `#/forge/:id` | `renderForge` / `_openForgePath` | Dev roadmap paths (cards with progress ring): `GET /api/forge/paths` + `GET /api/forge/stats`. Path detail: milestones → topics with status `<select>` → `POST /api/forge/topic/:id/status`. (This is learning.js forge, NOT the admin builder.) |
| `#/workshop` | `renderWorkshop` | Tabs: **Problems** (stats bar `GET /api/workshop/stats`; list `GET /api/custom-problems`, client filter all/easy/medium/hard/extreme + cards/table views; create/edit form `showCreateProblem` → `POST/PUT /api/custom-problems`; delete; "solve" → `openSolveCustom(id)` reuses the solve overlay with custom-problem testcases), **Contests** (`GET /api/contests/mine`, create form → `POST /api/contests/create` with client-generated `NX-XXXXXX` code, password ≥4, problem picker from own custom problems; detail overlay `GET /api/contests/:id`, delete), **Join Contest** (`POST /api/contests/join` with code+password). |
| `#/social` | `renderSocial` | "Community" — requires username (gate otherwise). Tabs: `/me` (profile hero + edit form → `POST /api/user/register` upsert), `/allies` (friends + requests: `GET /api/friends/:me`, `GET /api/friends/:me/requests`, accept/reject; search `GET /api/user/search?q` → add friend `POST /api/friends/request`), `/chat` (friend list w/ unread badges `GET /api/messages/unread/:me`; conversation view `GET /api/messages/:a/:b`, send `POST /api/messages`, emoji reactions `POST /api/messages/:id/react`, typing via socket), `/rooms` (`GET /api/rooms`, create `POST /api/rooms`, room view `GET /api/rooms/:id` + messages, socket chat/code-sync/voice), `/feed` (`GET /api/feed/:me`), `/top` (`GET /api/leaderboard?type&limit=25`, type toggle xp/solved/streak). Socket `challenge-friend` → toast with "Accept" → opens solve overlay. |
| `#/profile`, `#/profile/:username` | `renderUserProfile` | Full gamified profile: XP ring (percent to next level), avatar+level badge, admin glow/badge, hero stats (solved/XP/streak/level), 11-node level progression timeline (client-side LEVEL_NAMES/LEVEL_COLORS arrays duplicate server data), activity feed, friend actions (add/accept/message per `friendStatus`). Own profile: **Edit Profile modal** — avatar upload (`POST /api/user/avatar`, data-URL) or 20-icon picker, username/display name/bio/password change → `PUT /api/user/profile` (sends `currentUsername`), settings + logout buttons. Data: `GET /api/user/profile/:username?viewer=me`, `GET /api/stats` for level when needed. |
| `#/settings` | `openSettings()` | Opens settings **overlay** (not a page). Fields: CF/CC/AtCoder handles, default language, font size, tab size, word wrap, minimap, bracket colorization, time limit, auto-submit, compact sidebar, show XP, sound, AI difficulty, AI hints → `POST /api/settings` (all string values). Extra actions: Sync All Problems (sequential `POST /api/sync` per platform), Export Data (client-side JSON blob of stats+settings → `nexora-progress.json`), **Reset Progress** (double confirm → `POST /api/reset-progress`). |

### Solve overlay (opened via `App.openSolve(problemId)` — no hash route)
- Layout: HUD bar (exit, timer, combo, quest text, XP reward, tries, minimize) + floating draggable/resizable **problem panel** (8-direction edges) + full-bleed Monaco editor + floating **bottom panel**.
- Problem panel tabs (`data-stab`): `description` (readme.md — scraped statement, meta chips time/memory limits, tags, Translate button → `POST /api/translate`, Examples with Import / Import All → `POST /api/testcases`) and `submissions` (git log — verdict list from `GET /api/problems/:id`, click → code replay player with 1x–16x speed, `GET /api/code-replay/:id`). A "thinking/decomposition" panel exists (`_loadThinkingTab`, 5 auto-saving textareas → `POST /api/decomposition`).
- Bottom panel tabs (`data-btab`): `test/` (testcase deck w/ prev/next, add `POST /api/testcases`, delete), `stdout` (run/submit results), `gdb` (debug visualizer parsing `[DBG]` lines from stderr).
- Editor toolbar: language picker (32 langs, grouped, searchable), AI toggle (inline completions → `POST /api/ai-complete` debounced), `ai fix` (→ `POST /api/ai-fix`), `co-op` (socket room-code-change collab), `1v1` (AI race: `POST /api/ai-battle/start`, progress overlay, `POST /api/ai-battle/complete` on AC/timeout), `dbg`, focus/zen mode, reset, copy, panel toggles, Run (`Ctrl+Enter`), Submit (`Ctrl+Shift+Enter`).
- Run: if problem has testcases → `POST /api/judge` (no problem_id) else `POST /api/run`. Submit → `POST /api/judge` with `problem_id` (persists submission/progress/XP).
- Gamification on AC: combo counter (popup DOUBLE!/TRIPLE!/QUAD!/PENTA KILL!, XP bonus label `(+min(n-1,5)*20% xp)` — display only, server awards flat `calcXp`), screen shake + red flash on WA, confetti on AC, XP popup with rating-based reward, achievement-unlock popup (diffs `stats.achievements` before/after), code replay auto-saved (`POST /api/code-replay` keyed to newest submission id, only if >5 events).
- Floating AI tutor FAB → chat panel (`POST /api/ai-chat` with statement + history).
- `openSolveCustom(id)` — same overlay for workshop custom problems (`GET /api/custom-problems/:id`).

### Gate / onboarding (shown when no username)
Two-step: login (`POST /api/user/login`) or register flow — username availability check (`GET /api/user/check-username`, live validation), display name, 20-avatar picker, bio, optional password → `POST /api/user/register`; sets `localStorage['cp_arena_username']`. OAuth buttons link to `/auth/github`, `/auth/google`; on `?auth=` return the session user is adopted. Logout: `POST /api/auth/logout` + clears localStorage.

### Command palette (`⌘K`) & shortcuts
`openCmdPalette` searches modules (nav actions) + problems client-side; `openShortcuts` lists keybindings. Keyboard: `Ctrl/⌘+K` palette, `Ctrl+Enter` run, `Ctrl+Shift+Enter` submit, `Esc` exit overlay, `⌘⇧F` focus mode.

---

## 5. Sub-apps (separate HTML pages)

| Page | Served at | Auth gate | Purpose / main endpoints |
|---|---|---|---|
| `studio.html` (2,892 ln) | `GET /studio` | Client-side login gate: prompts **studio password** → stored in `localStorage['nx_tk']` → sent as `x-studio-token` header on all `/api/studio/*` fetches (server also accepts admin session). Wrong password shows "Invalid password". | Teacher/admin CMS: courses→chapters→lessons tree CRUD, lesson media upload (`POST /api/studio/upload`), link platform/custom problems to lessons, publish toggles, reorder, notes, doubts inbox, tutorials & AI-problems management, forge content overrides, custom problem editor, code runner (`POST /api/studio/run-code` via Piston), AI assist (`POST /api/studio/ai-assist`). Links out to `/explainlab` and `/live-class`. |
| `explainlab.html` (310 ln shell + `js/explainlab/*`) | `GET /explainlab` | Session auth (`requireAuthenticatedUser` on writes; teacher_id = session username). No token gate. | Whiteboard explanation recorder/builder: sessions CRUD (`/api/explainlab/sessions...`), infinite whiteboard (`whiteboard-engine.js`) with event streaming (`POST .../events`, `/events/bulk`), code events, pages, markers/clips, handwritten notes (media via `POST /api/studio/upload`), typed notes & full explanation HTML, student doubts w/ coordinates + replies, AI summary/notes/quiz/flashcards, publish flow. |
| `explainlab-viewer.html` | `GET /explainlab/view/:id` | Public read for published sessions (drafts hit the buggy `\|\|` 403 check). | Playback of a recorded explanation: replays events on timeline, student notes/bookmarks/doubts (`POST .../notes`, `.../bookmarks`, `.../doubts`), progress tracking (`POST .../progress`), clips/markers navigation. |
| `live-class.html` (1,440 ln) | static `/live-class.html` (studio links to `/live-class`) | Redirects to `/studio` on some failures; expects session role teacher/student (reads `data.isTeacher`). | Live classroom UI: participants panel, chat, raise hand, recording controls, WebRTC. **Non-functional**: emits `live:*` socket events the server never handles, and the REST endpoints it would need (`POST /classes`, `join`, `messages`) are broken (undefined functions → 500). Treat as not implemented for the rebuild. |
| `forgebuilder.html` (1,662 ln) | static `/forgebuilder.html` | Server enforces admin session on `/api/forge/*` writes (401/403); page itself has no client gate. | Admin no-code page builder: pages/schema editor, versions & rollback, publish/unpublish, components, data models, forms, workflows, navigation, themes, settings, health check — all under `/api/forge/*` (builder side, §2.14). Note the broken PUT/DELETE page URLs. |

---

## 6. Gotchas

**Envelope exceptions**
- `GET /api/languages` → bare array (no `{ok}`).
- `POST /api/run` → judge `quickRun` object directly (`{ok,verdict,output,stderr,timeMs}` / `{ok:false,verdict:'CE',error,...}`).
- HTTP **200 with `ok:false`**: `POST /api/friends/request` ("Already friends"/"Request already pending"), `GET /api/code-replay/:id` ("No replay"), `POST /api/ai-complete` failures (`{ok:false,text:''}`).
- Real HTTP error codes: 401 auth, 403 admin/owner/enrolled, 404 not found (login, contest join), 400 validation, 429 rate limits.

**Broken / dead server code**
- `live.js`: create/update/start/end/join/leave/messages/publish-recording all call undefined functions → 500. `live:*` socket events never registered. Live-class feature = dead.
- `forge.js`: `PUT/DELETE /api/forge/pages/:id` are registered at literal path `/api/forge/api/forge/pages/:id` (router double-prefix bug).
- `GET /explainlab/dashboard` serves `explainlab-dashboard.html`, which does not exist in `public/`.
- Duplicate registrations: `GET /api/roadmap` (server.js ×2 — first wins); `GET /api/user/search` (auth.js wins over server.js copy; slight column-order difference).

**Shape inconsistencies**
- `allTitles` fields: `/api/stats` → `min_xp`/`min_problems` (snake); `/api/performance` → `minXp`/`minProblems` + extra `level` (camel). Frontend profile/hub pages consume the snake_case version.
- `player_titles` DB table is seeded with **legacy XP thresholds that differ from `RIFT_LEVELS`**; server computes levels from the constant, not the table. Treat RIFT_LEVELS (§2.5) as the source of truth.
- Contest `GET /api/contests` (live scrape: `phase/startTime/durationSeconds`) vs custom contests (`status/start_time/duration_mins`) — same prefix, totally different schemas.
- `/api/forge/*` is shared by the public learning roadmap (learning.js, mounted first) and the admin builder (forge.js).
- Problem `tags`, custom-problem `samples`/`testcases`/`tags`, ai_problem `hints`/`resources`/`samples`, contest `problems` are **JSON strings** needing `JSON.parse` on the client; explainlab event `payload_json` is parsed to `payload` by the GET events endpoint only.

**Semantics traps**
- `GET /api/messages/:user1/:user2` **marks messages read** as a side effect.
- Message reactions and room `member_count` are **in-memory only** (lost on restart).
- `GET /api/leaderboard` ranks by `xp_override`/`solved_override` columns only — real progress is NOT reflected; `type=streak` sorts by `solved_override` as a fake `best_streak`. Regular users have 0/NULL overrides.
- `GET /api/performance`, `GET /api/settings`, `GET/POST /api/dashboard-layout` are **global, not per-user**.
- `POST /api/user/register` doubles as profile-update (returns `updated:true`) — the social `/me` tab saves via register, not PUT profile.
- Login accepts any password for accounts without `password_hash` (OAuth-created).
- `POST /api/sync` with `'all'` runs on every legacy page load; it hits 6 external scrapers (CF skipped via HTTP path due to Cloudflare; Puppeteer fallback exists). Do not replicate blindly.
- Testcases are global per problem; any user can add/delete them (`POST/DELETE /api/testcases`).
- Judge side effects (XP, progress, achievements, daily activity) only happen when `problem_id` is passed to `/api/judge`.
- Achievements: 20 seeded rows (`first_blood, streak_3/7/30, solve_10/50/100/500, rating_1000/1400/1800/2100, both_platforms, speed_demon, perfect_score, night_owl, early_bird, marathon, tag_master, daily_warrior`) — returned as full rows with `progress/target/unlocked_at`; the UI detects unlocks by diffing arrays across a submit.

**Hardcoded constants the React app will need**
- Studio default password `nexora-studio` (env `STUDIO_PASSWORD`); contest password salt `"nexora_salt"` (sha256); contest code alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, prefix `NX-`.
- Admin usernames `gurudeep`, `gurudeeppaidipati` (xp_override 500000, solved_override 5000).
- XP-by-rating table and RIFT_LEVELS (§2.5); combo XP bonus is **display-only** (`min(n-1,5)*20%`), server awards flat XP.
- Solve HUD difficulty tiers by rating: ≥2400 BOSS 💀, ≥2000 MASTER ☠️, ≥1800 EXPERT 🔥, ≥1600 ELITE ⚡, ≥1400 WARRIOR ⚔️, ≥1200 APPRENTICE 🗡️, ≥1000 NOVICE 🌱, else ROOKIE 🔰.
- Rating badge tiers (charts): Newbie <1200, Pupil <1400, Specialist <1600, Expert <1800, Candidate Master <2000, Master <2200, Grandmaster ≥2200.
- Avatar upload limit 2 MB data-URL (png/jpeg/webp); studio upload 50 MB; message content truncated at 2000 chars; room name ≤50 chars; replay events capped 2000, saved only if >5.
- Level-roadmap weekly reshuffle seed = `floor(Date.now() / 604800000)`; UI shows "Refreshes in N days".
- `GET /api/stats` and `/api/performance` have a 3-second server cache — refetch after a submit may return stale XP.
- Socket room naming: solve rooms `solve-${roomId}`; DM/personal rooms keyed by username.
- Monaco: theme `vs-dark`, font `'JetBrains Mono','Fira Code',monospace` 14px, tabSize 4, inline suggestions enabled (AI completion), replay events are Monaco `onDidChangeModelContent` deltas.

**Pagination summary**: `/api/problems` limit 50 (max 200) + offset; explainlab sessions limit 50 (20 w/ search); studio all-problems limit 60 (max 200); forge pages/live classes limit 50; messages fixed 200; feed fixed 50; leaderboard default 25 max 100; user search fixed 20.
