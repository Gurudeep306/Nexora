# Database usage (Turso free plan)

The free plan allows **500M rows read** and **10M rows written** per month
(5 GB storage; we use ~20 MB). Turso bills *rows*, not queries: every row a
statement scans counts as a read, so one `COUNT(*)` or unindexed
`WHERE`/`ORDER BY`/`LIKE` over the 27,718-row `problems` table costs ~28k
reads, and a `LEFT JOIN` probe per row doubles it.

The 75 % quota alert was caused by reads. This page records what was
measured, what changed and what to watch.

## How to measure

* **Instrumentation** — `src/db-stats.js`, wired into `run/get/all/runMany/runBatch`
  in `src/db.js`.
  * Always on, and free: totals since boot (statements, rows returned, rows
    written = affected rows).
  * `DB_STATS=1` (opt-in): per-statement fingerprints with calls, rows
    returned, rows written and an **estimate of rows read**, plus a
    per-endpoint breakdown. Neither libSQL nor node's SQLite report rows
    read, so each distinct statement is run once through
    `EXPLAIN QUERY PLAN`. A `SCAN` of a table is costed at the table size
    (`MAX(rowid)`, a 1-row read, cached for 10 min), with one extra probe per
    scanned row for each joined `SEARCH`. A `SEARCH` on its own is costed at
    the rows it returns. So scans are pessimistic and always flagged, while
    selective index searches are a lower bound (an aggregate over an index
    range reads more rows than it returns).
  * Turning `DB_STATS=1` on in production is safe. It costs one EXPLAIN round
    trip per *new* statement shape (a few hundred per process) and reads no
    table rows.
* **Admin** — `GET /api/admin/db-stats` (permission `analytics.view`; anyone
  else gets the same 404 as the rest of the admin API), and the **Database
  usage** card in Admin → Overview. The card shows reads/writes since boot,
  the top statements, and a monthly projection against the quota. It warns
  when the projection passes `DB_QUOTA_WARN` (default 50 %). The quotas can
  be changed with `DB_QUOTA_READS` / `DB_QUOTA_WRITES`. Without `DB_STATS`
  the read figure is rows *returned*, which is a lower bound.
* **Traffic mix** — `node scripts/ops/traffic-mix.js [--out file.json]`.
  * Always runs against a fresh local temp DB: `TURSO_*` are blanked and the
    internet is stubbed out by `scripts/ops/offline-stub.cjs`. It runs in
    production mode with `DB_STATS=1`.
  * It seeds the fixture with `scripts/ops/seed-fixture.js`: 27,718 problems
    on six platforms, 1,836 statements, 62 users with progress, submissions,
    activity, posts, follows and GATE attempts.
  * It then measures, in order: a boot, 30 health checks, the private-mode
    gate (anonymous hits), an owner session, the owner opening the site, two
    member sessions (problems with filters/search/sort/pages, hub, profile and
    showcase, social feed/explore/suggestions, GATE, leaderboards, AI-tutor
    data, learn), anonymous browsing, a quiet period and a plain restart.

## Top offenders found (before)

| # | What | Cost | When |
|---|---|---|---|
| 1 | **Background pre-scraper** (`_backgroundScrape`): `problems LEFT JOIN problem_statements … ORDER BY rating` ×2 per batch | ≥55k reads per batch | on every boot, then every ~1–2 min for as long as the process is up (it never ran out of work: failed pages were retried forever) — **tens of millions of reads a day** |
| 2 | `GET /api/problems`: `COUNT(*)` + page query, both full scans with a progress probe per row | ~80k reads per request | every list / filter / search / page |
| 3 | `GET /api/stats`, `/api/performance`: `(SELECT COUNT(*) FROM problems)` | ~55k per request | hub, every page with the level badge (3 s cache only) |
| 4 | `GET /api/leaderboard`: aggregate over all of `progress` + `daily_activity` | ~30k per request | every leaderboard view (no cache) |
| 5 | `GET /api/tags`: `SELECT DISTINCT tags FROM problems` | ~28k per request | problem filters |
| 6 | Catalog reload (`src/problem-catalog.js` TTL) | 28k | every 10 min while busy, and on every boot |
| 7 | Daily challenge `ORDER BY RANDOM()`, skill-tree node `LIKE` + `COUNT`, AI-tutor `searchProblems` / weakness picks / recommendations, tutorial problems | up to 28k each | per call |
| 8 | GATE leaderboard aggregate over `gate_attempts` | ~5k per request | every view (no cache) |
| 9 | Boot: `UPDATE users … COLLATE NOCASE` (scan + a write every boot), achievement back-fill scanning `progress` (and ~13 upserts per user), `COUNT(*) FROM tutorials` | users + progress rows | every boot (Render's free plan restarts often) |
| 10 | Every AC submission: ~13 achievement upserts (each a row written even when nothing changed) plus a definition read per award | ~13 writes + ~13 reads | per accepted submission |
| 11 | Site settings re-read every 5 s; badge directory scanning `users` every 30 s; explore feed walking the whole `social_posts` table; who-to-follow aggregates on every view | small but constant | per request path |

Sessions were already throttled (one expiry write per hour per process). There
was no write on every request, but every restart started a new round of
writes, and every request read the session again.

## What changed

* **Problem catalog in memory** (`src/problem-catalog.js`).
  * List, filter, search (exact SQLite `LIKE` semantics), sort, pagination,
    counts, tag lists, random picks, skill-tree pools, scrape stats, CF-sync id
    lookups and the AI-tutor problem lookups are all answered from memory.
  * Per-user progress comes from an indexed read of only that user's rows
    (only the ≤50 rows of the current page when there is no status filter).
  * Filter/sort results are memoised per catalog version.
  * **Loading is ~free.**
    * Triggers bump `catalog_meta.problems` on every
      INSERT/UPDATE/DELETE of `problems`, whoever makes the change: this
      server, the scraper, Studio edits, scripts, or a manual edit.
    * `catalog_snapshot` holds the catalog as gzip+base64 JSON in 2–4 rows,
      stamped with that version.
    * A cold start reads the version plus the snapshot (~5 rows). Only after
      a real change does one process rebuild it from `problems` (28k, once
      per change).
    * Readers re-check the version, a 1-row read, at most every 5 s
      (`CATALOG_CHECK_MS`; 0 in tests).
  * A build-time JSON snapshot was not used. The repository has no copy of
    the catalog (it comes from the platform APIs into the DB), so a build
    step would need production credentials. The DB snapshot gives the same
    cold-start cost (~0) with the DB as the single source of truth.
* **Leaderboard totals** — the `user_stats` table is kept in step with
  `progress` / `daily_activity` by triggers, and filled once on the first
  boot. A leaderboard refresh now reads ~2 rows per user instead of all
  progress. It is also cached (5 min, or 1 min after a write).
* **Caches with write invalidation** (`src/shared-cache.js`): leaderboard,
  GATE leaderboard (all ranks per period, then top 50 plus "me" from
  memory; 10 min, or 5 min after new attempts), active announcements for `/api/site/status`, the tutorial list,
  and who-to-follow suggestions (per user, 10 min, dropped on any
  follow/block/friendship/user write). GATE question difficulty map: 1 h.
  Site settings: 60 s (`SITE_SETTINGS_TTL_MS`). In-process writes still
  invalidate immediately; the emergency CLI is picked up within a minute.
* **Sessions** (`src/session-store.js`).
  * Writes happen only on sign-in, sign-out or a real change. The rolling
    expiry moves at most once per 6 h (`SESSION_TOUCH_INTERVAL_MS`), judged
    against the expiry stored in the row, so restarts no longer cause a new
    round of writes.
  * Reads go through an in-process LRU (5,000 sessions, 30 s TTL,
    `SESSION_CACHE_TTL_MS`; off in tests). The cache is invalidated at once by
    sign-out, sign-in, role/verified/username changes, permission overrides,
    bans and force-sign-out (db write hooks).
  * A manual DB edit made outside the process applies within the 30 s TTL.
* **Background jobs.**
  * The pre-scraper is now opt-in: it only runs with `BG_SCRAPE=1`, and never
    with `DISABLE_SCRAPER=1` or in tests. Statements are still fetched on
    demand when someone opens a problem.
  * When enabled, it is strictly incremental. It reads the cached-statement
    ids once and takes pending problems from the in-memory catalog. Every
    problem it tries is remembered, so it never re-scans or retries a dead
    page.
  * The achievement back-fill at boot runs once, behind a settings marker. CF
    sync now awards achievements immediately, which is what the boot scan
    used to catch.
  * The owner fix-up at boot reads by index and writes only when the role is
    actually wrong.
  * `COUNT(*) FROM tutorials` became `LIMIT 1`.
* **Writes** — `checkAchievements` reads the definitions once (cached) and the
  user's achievement rows once, and only writes rows whose progress or unlock
  actually changes. That is 0–2 writes per AC instead of ~13.
* **Indexes** — `submissions(username, submitted_at)`, `users(role)`,
  `users(verified) WHERE verified = 1`, `users(username COLLATE NOCASE)`
  (sign-up/availability checks and the owner lookup no longer scan `users`).
  The explore feed now walks `idx_social_posts_time`. The existing indexes
  already covered `progress(username, problem_rowid)` (unique key),
  `problems(platform, problem_id)` (unique), `problems(rating)`,
  `daily_activity(username, date)` (PK), the social tables and the GATE
  tables.
* **Health / private-mode gate** — `/api/health` does no DB work. The gate
  reads settings from the 60 s cache, and anonymous requests never touch the
  session store, so 30 health checks plus 40 gated anonymous hits cost 2
  rows in total.

## Before → after (traffic mix, same fixture)

Rows read are the instrumentation's estimate (see above). Rows written are
exact.

| Phase | Requests | Rows read before | after | Rows written before | after |
|---|---:|---:|---:|---:|---:|
| Boot (incl. warm-up, first scraper batch) | – | 93,341 | 28,285¹ | 785² | 5 |
| Restart (cold start + sign-in) | 1 | ≈93,000 | **564** | – | 1 |
| Health checks ×30 | 31 | 1 | 1 | 0 | 1 |
| Private-mode gate, anonymous ×40 | 41 | 11 | 1 | 0 | 0 |
| Owner session (~50 calls) | 50 | 1,009,746 | 9,725³ | 3 | 3 |
| Member sessions ×2 | 99 | 1,852,283 | 7,986 | 2 | 2 |
| Anonymous browsing ×10 | 61 | 2,513,411 | 30 | 0 | 0 |
| **Total** | 287 | **5,468,801** | **46,031** (−99.2 %) | 792 | 13 |

¹ The measured boot follows the fixture seeding, so it is the one rebuild of
the catalog snapshot (27,718). A normal restart reads the snapshot instead
(see the restart row).
² One-time achievement back-fill for the 62 fixture users.
³ Includes the one leaderboard and GATE-leaderboard refresh of the run.

Per endpoint (rows read per request):

| Endpoint | before | after |
|---|---:|---:|
| `GET /api/problems` (any filter/search/page) | 79,754 | 34 |
| `GET /api/stats` | 55,524 | 87 |
| `GET /api/performance` | 55,903 | 466 |
| `GET /api/leaderboard` | 29,595 | 10 (124 per refresh) |
| `GET /api/tags` | 27,719 | 0 |
| `GET /api/gate/leaderboard` | 4,961 | ≈0 cached (4,960 per refresh, ≤1 per 5 min) |
| `GET /api/social/feed` (home + explore) | 764 | 142 |
| `GET /api/social/suggestions` | ≥219 | ≈0 cached (145 per refresh) |
| `GET /api/tutorials` | 144 | 48 |
| `GET /api/site/badges` | 22 | 0 (cached; indexed refresh) |
| `GET /api/site/status` | 1 | 0 |
| background pre-scraper | ≥55k per batch, every 1–2 min | 0 (off) |
| catalog reload | 27,718 per 10 min + per boot | ~5 per boot; 1 per 5 s check while in use |

Endpoints that read the signed-in user's own progress (nexus, roadmaps,
skill tree, weakness analysis, showcase) cost about one row per progress row
of that user (~300 in the fixture). They are unchanged in shape. The
showcase now reads progress once instead of four times.

## Projection

Assumptions: 1,000 daily users, each doing one heavy session like the mix
(~50 API calls, ~4,000 rows read). The site restarts ~30 times a day. During 16 busy hours the XP
leaderboard refreshes at most once a minute, and the GATE leaderboard at most
once every 5 minutes per period. There are
1,000 users and ~20k GATE attempts in the window.

| | per day | per month | share of free quota |
|---|---:|---:|---:|
| Sessions | ~4.0M | ~120M | 24 % |
| Restarts (564 each) | ~17k | ~0.5M | <0.1 % |
| Leaderboard refreshes (~2k rows × ≤960) | ≤1.9M | ≤58M | ≤12 % |
| GATE leaderboard refreshes (~20k attempts × ≤192 per period) | ≤3.8M | ≤115M | ≤23 % (worst case) |
| **Reads, typical** (leaderboards refresh far less than the cap) | ~5–7M | **~150–210M** | **30–42 %** |
| Writes (sessions, solves, attempts, activity) | ~20–40k | ~1M | ~10 % |

Before, the same traffic would have cost ~925M reads a day for sessions
alone, before the scraper. In practice the quota was being burnt by the
scraper and by `/api/problems`, well ahead of the user count.

## What to watch

* **The admin card.** If the projection goes amber (≥50 %), open
  `/api/admin/db-stats?top=50` with `DB_STATS=1` set and look at `topReads`,
  `scanning` and `endpoints`.
* **GATE leaderboard.** One refresh reads the attempts of the period
  (week/month/all) and is cached for 10 min, or 5 min after new attempts. If
  `gate_attempts` grows into the hundreds of thousands, maintain per-period
  totals the way `user_stats` does for the XP leaderboard.
* **Per-user progress reads.** These grow with each user's progress. If heavy
  users reach thousands of rows, a short per-user progress cache is the next
  step.
* **Do not re-enable the pre-scraper on the free plan.** `BG_SCRAPE=1` is
  incremental now, but every saved statement is a write. Production has
  `DISABLE_SCRAPER=1` as well, and the staging service shares the same Turso
  quota if it uses the same org: keep it off there too.
* **Remaining full scans (not hot paths).**
  * The catalog rebuild after a `problems` change.
  * AI "find problems" scoring in `src/ai-assist.js`. It is user-triggered,
    rate-limited to 20/min and cached per query.
  * The Studio problem browser and admin user detail / force-sign-out
    (`json_extract` over `sessions`).
  * `npm run scrape` (manual CLI) and the one-time `user_stats` /
    achievement back-fills.
* **Guard rails.** `tests/db-usage.test.js` fails if any hot endpoint
  performs a full scan of `problems` (EXPLAIN-based, through
  `/api/admin/db-stats`), or if a signed-in page view writes the session. It
  also checks that the catalog answers `/api/problems` exactly like the SQL
  it replaced, that cached sessions honour sign-out, role changes, force
  sign-out and bans at once, and that `user_stats` stays equal to the
  aggregates.
