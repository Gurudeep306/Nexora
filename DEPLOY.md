# Deploying Nexora for free

The live site runs on **Render** (free web service). Data is stored in **Turso** (free cloud SQLite). Updates ship from **GitHub**: `git push` → CI tests → auto-deploy.

```
 Your Mac / Codespaces ──git push──▶ GitHub ──CI passes──▶ Render (free)  https://nexora-xxxx.onrender.com
                                       │                         │
                                       │ nightly backup           ▼
                                       └──────────────────▶ Turso (free) — users, problems, XP, sessions, uploads
 UptimeRobot (free) ── pings /api/health every 5 min ──▶ keeps the site awake
```

| Piece | Free allowance | Card? |
|---|---|---|
| GitHub (repo, Actions CI, Codespaces) | Unlimited private repos · 2,000 Actions min/month · 120 Codespaces core-hours/month (180 with Student Pack) | No |
| Render web service | 512 MB RAM · 750 instance-hours/month (one service 24×7 = 744 h) · sleeps after 15 min idle | No |
| Turso database | 5 GB · 500 M row reads · 10 M row writes per month · no cold starts | No |
| UptimeRobot | 50 monitors, 5-minute checks | No |

**Total cost: ₹0.**

---

## One-time setup (≈ 30 minutes)

### 1. Put the code on GitHub

The project already points at `github.com/Gurudeep306/Nexora`. In Terminal:

```bash
cd ~/Desktop/Projects/nexora
git add -A
git commit -m "Cloud-ready: Turso database, Render blueprint, CI/CD"
git push origin main
git push origin main:staging          # creates the staging branch
```

`.gitignore` keeps `.env`, `tracker.db` and `public/uploads` out of GitHub. Your secrets and data never go into the repo.

### 2. Create the cloud database (Turso)

1. Go to **https://app.turso.tech** and sign up with GitHub.
2. Create a database named **`nexora`**. Pick the location **AWS US East (Virginia) — `aws-us-east-1`**, next to the Render server.
3. Open the database and copy its **URL** (`libsql://nexora-<you>.aws-us-east-1.turso.io`).
4. Create a **token** and copy it. It is shown once.
5. *(Optional, for staging)* Create a second database `nexora-staging` in the same location, with its own token.

Copy your current local data (users, problems, submissions, uploads) into it:

```bash
# add to your local .env (the server ignores these unless NODE_ENV=production)
TURSO_DATABASE_URL=libsql://nexora-<you>.aws-us-east-1.turso.io
TURSO_AUTH_TOKEN=<token>

# stop the local server first (Ctrl+C), then:
npm install
npm run db:push-to-cloud
```

It prints each table with ✓ and finishes with `✓ Copied … rows to Turso`. It is safe to re-run. It refuses to overwrite a cloud DB that already has users unless you add `-- --force`.

### 3. Create the site on Render

1. Go to **https://dashboard.render.com** and sign up with GitHub. No card is needed.
2. Click **New → Blueprint**, pick the **Nexora** repo and branch `main`. Render reads `render.yaml` and shows two services: `nexora` and `nexora-staging`.
   - Don't want staging? Delete the `nexora-staging` block from `render.yaml` first and push.
3. Fill in the values it asks for. Paste them from your `.env`:

   | Key | Value |
   |---|---|
   | `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | from step 2 (staging gets the staging DB) |
   | `GROQ_API_KEY`, `GEMINI_API_KEY`, `STUDIO_PASSWORD` | same as local |
   | `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET` | see step 4 (leave empty for now if you like) |

   `SESSION_SECRET` is generated automatically. `NODE_ENV`, `JUDGE_MODE=remote` and `DISABLE_PUPPETEER` are preset.
4. Click **Apply**. The first build takes about 3–5 minutes. Your site is then live at `https://nexora-xxxx.onrender.com`. Open `/api/health`; it should show `"db":"libsql"`.

### 4. Make GitHub / Google sign-in work on the live URL

- **GitHub:** go to github.com → Settings → Developer settings → OAuth Apps → **New OAuth App** "Nexora (live)".
  - Homepage: `https://nexora-xxxx.onrender.com`
  - Callback: `https://nexora-xxxx.onrender.com/auth/github/callback`
  - Paste its Client ID and secret into Render (Environment tab). Keep your existing app for localhost, since a GitHub OAuth app allows only one callback URL.
- **Google:** go to console.cloud.google.com → Credentials → your OAuth client and add the redirect URI `https://nexora-xxxx.onrender.com/auth/google/callback`.

`APP_URL` is detected automatically from Render (`RENDER_EXTERNAL_URL`). Set it only if you add a custom domain.

### 5. Keep it awake (no 1-minute cold starts)

1. Go to **https://uptimerobot.com** and sign up.
2. Click **New monitor → HTTP(s)**.
3. URL: `https://nexora-xxxx.onrender.com/api/health`. Interval: **5 minutes**.

You also get an email if the site goes down. Only ping the **production** service: two always-on services would exceed Render's 750 free hours. Staging simply sleeps until you open it.

### 6. Turn on nightly backups

In the GitHub repo, go to **Settings → Secrets and variables → Actions → New repository secret**:

- `TURSO_DATABASE_URL` — the production URL
- `TURSO_BACKUP_TOKEN` — a **read-only** token from Turso (or reuse `TURSO_AUTH_TOKEN`)

Every night at 03:00 IST the **Nightly backup** workflow saves a compressed copy of the database for 14 days. To get one, open **Actions → Nightly backup → a run → Artifacts**.

---

## Everyday workflow: shipping updates

```
feature branch ──PR──▶ staging ──check the staging URL──▶ main ──▶ live site
```

1. **Develop locally**, on your Mac or in a Codespace:
   ```bash
   npm run dev          # server with auto-restart  → http://localhost:3000
   npm run client:dev   # React UI with hot reload → http://localhost:5173
   ```
   Locally the app uses `tracker.db`, never the live database.
2. **Try it on staging** (optional):
   ```bash
   git checkout staging && git merge my-feature && git push
   ```
   CI runs, and if it passes, `nexora-staging` redeploys in about 3 minutes.
3. **Ship to production:**
   ```bash
   git checkout main && git merge staging && git push
   ```
   CI runs, and if it passes, the live site redeploys. Users' data in Turso is untouched.

**What CI checks** (`.github/workflows/ci.yml`) on every push:
- server syntax;
- the existing smoke tests;
- a cloud end-to-end test: production mode against a Turso-compatible database, proving logins and uploads survive a restart, and that user code never runs on the server;
- client lint;
- TypeScript;
- the Vite build.

Render deploys only when all checks are green (`autoDeployTrigger: checksPass`).

**Undo a bad deploy:** in Render, open the service → **Events**, find the previous deploy, and click **Rollback**. Or `git revert <commit> && git push`.

**Code from any computer:** on GitHub, click **Code → Codespaces → Create codespace**. Node and dependencies are preinstalled (`.devcontainer/`).

---

## What changed in the code to make this work

| Change | Why |
|---|---|
| `src/db.js` talks to Turso via `@libsql/client` in production | Render's free disk is wiped on every restart or sleep, so `tracker.db` would be lost |
| `src/session-store.js` stores logins in the DB | The default in-memory store logged everyone out on every restart |
| `src/upload-store.js` saves uploads to the DB and restores them on demand | Avatars and Studio media would vanish on restart |
| `JUDGE_MODE=remote` in `src/judge.js` | On a public server, submitted code must never run on the host (it could read your secrets); it runs on Wandbox instead |
| Session cookie `SameSite=Lax` | `Strict` drops the cookie on the GitHub/Google redirect back |
| `APP_URL` and CORS default to the Render URL | Socket.IO (chat, rooms) would otherwise reject the live site |
| `DISABLE_PUPPETEER=1` | There is no Chrome on the free plan; plain HTTP scraping still works |
| ForgeBuilder seed fix | It re-inserted 12 duplicate components on every restart |
| `scripts/migrate-to-turso.js`, `scripts/backup-turso.js` | Move data to the cloud, and back up or restore it |

## Limits and troubleshooting

- **First visit slow?** It woke up from sleep (about 1 min). Set up UptimeRobot (step 5).
- **Build fails on Render?** Open the deploy log. CI usually catches problems first; check the Actions tab.
- **"Authentication required" after deploy?** Make sure you're on `https://` (cookies are HTTPS-only in production).
- **Code runs fail with "Remote execution…"?** Wandbox (the free compiler service) is having trouble. Try again later.
- **Uploads over 50 MB** aren't saved to the database (`UPLOAD_PERSIST_MAX_MB`). Keep Studio videos small, or link YouTube.
- **Free-tier ceilings:**
  - Turso: 10 M row writes/month.
  - Render: 750 h/month, plus a monthly bandwidth and build-minute allowance (see render.com/pricing).

  For a student project you won't come close. If you ever outgrow them, Render's paid plan and Turso's paid plan need no code changes.
