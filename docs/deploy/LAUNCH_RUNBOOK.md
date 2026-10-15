# Launch runbook: nexoraguru.in

This runbook takes the app from Render to your own domain on a free stack. Do the steps in order. Each one ends with a ✅ check, so you know it worked before you move on. Plan on about 2–3 hours, plus up to a day for the nameserver change to spread.

```
                    ┌──────────────── Cloudflare (DNS · SSL · CDN · free) ───────────────┐
 browser ──https──▶ │ nexoraguru.in / www  ──▶ Cloudflare Pages (client/dist + GATE figs)│
                    │ api.nexoraguru.in    ──▶ Oracle VM: Caddy :443 → Node :3000 (pm2)  │
                    └────────────────────────────────────────┬───────────────────────────┘
                                                             │  Piston :2000 (Docker, local only)
                                                             ▼
                                                  Turso (database, unchanged)
 GitHub: push main → CI tests → (a) Pages builds the site  (b) deploy-api.yml SSHes to the VM
 UptimeRobot pings /api/health · Sentry collects errors · nightly Turso backup in Actions
 Render stays as staging (and as the rollback target).
```

> **Words used below.** *Apex* = `nexoraguru.in` with nothing in front. *Orange cloud / grey cloud* = the "Proxy status" switch on a Cloudflare DNS record: orange means traffic goes through Cloudflare, grey means DNS only. *VM* = the Oracle virtual machine.

---

## 0. Before you start

- [ ] You can log in to **GoDaddy** (where nexoraguru.in is registered), **GitHub** (repo `Gurudeep306/Nexora`), **Render**, **Turso**.
- [ ] On your Mac, in the project folder: `git pull` so you have this runbook and the `deploy/` folder.
- [ ] Keep a notes file open. You will collect: the VM IP, the Pages project name, and a few keys.

---

## 1. Create a Cloudflare account and add the domain

1. Go to https://dash.cloudflare.com/sign-up and sign up. The free plan is enough.
2. On the dashboard click **Add a domain** (or **+ Add → Existing domain**).
3. Type `nexoraguru.in`, keep **Quick scan for DNS records**, click **Continue**.
4. Choose the **Free** plan → **Continue**.
5. Cloudflare lists the DNS records it found at GoDaddy. Delete any `A`/`CNAME` records for `@`, `www` or `api` that point at GoDaddy parking pages. You add the real ones in step 3. Keep any `MX`/`TXT` records for email. Click **Continue to activation**.
6. Cloudflare shows **two nameservers**, for example `ada.ns.cloudflare.com` and `bob.ns.cloudflare.com`. Copy both.

✅ The domain shows as **Pending nameserver update**.

## 2. Point GoDaddy at Cloudflare's nameservers

1. Log in at https://dcc.godaddy.com/control/portfolio (GoDaddy **Domain Portfolio**).
2. Click **nexoraguru.in** → open the **DNS** tab → click **Nameservers**.
3. Click **Change Nameservers** → choose **I'll use my own nameservers**.
4. Delete the existing entries. Paste the two Cloudflare nameservers into **Nameserver 1** and **Nameserver 2**.
5. Click **Save**, then tick the warning box ("I understand…") → **Continue**.
6. If GoDaddy asks about **DNSSEC**, turn it off at GoDaddy first. You can turn it on later from Cloudflare (**DNS → Settings → DNSSEC**).
7. Back in Cloudflare, click **Check nameservers now**.

✅ Within 5 minutes to 24 hours, Cloudflare emails you "nexoraguru.in is now active" and the domain shows **Active**. You can do steps 4–8 while you wait.

## 3. SSL and security settings in Cloudflare

Open **nexoraguru.in** in Cloudflare.

1. **SSL/TLS → Overview → Configure** → choose **Full (strict)** → Save.
   - *Why:* traffic is encrypted all the way to the VM (Caddy has a real certificate) and to Pages. Plain "Flexible" would create redirect loops.
2. **SSL/TLS → Edge Certificates**:
   - **Always Use HTTPS: Off.** Pages and Caddy already redirect to HTTPS themselves. With this setting off, Caddy can renew its Let's Encrypt certificate over plain HTTP through Cloudflare.
   - **Minimum TLS Version:** 1.2.
   - **Automatic HTTPS Rewrites:** On.
3. **Speed → Optimization → Content Optimization → Rocket Loader: Off.** It rewrites scripts and breaks the app.
4. **Network → WebSockets: On.** This is the default. socket.io needs it.

DNS records come in steps 6 (site) and 9 (api).

## 4. Create the Oracle Cloud account and VM

1. Sign up at https://signup.cloud.oracle.com.
   - **Home Region:** pick **India South (Hyderabad)** or **India West (Mumbai)**. You can't change this later.
   - Oracle asks for a card to verify you. Always Free resources are not charged.
2. Make an SSH key on your Mac:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/oracle_nexora -C "oracle-nexora"
   cat ~/.ssh/oracle_nexora.pub        # copy this line
   ```
3. In the Oracle console: **☰ → Compute → Instances → Create instance**.
   - **Name:** `nexora-api`
   - **Image and shape → Edit**:
     - **Change image → Ubuntu →** *Canonical Ubuntu 24.04* (**aarch64** build) → Select.
     - **Change shape → Ampere → VM.Standard.A1.Flex** → **4 OCPUs, 24 GB memory** (the whole Always Free allowance) → Select.
   - **Networking:** create a new VCN and a **public subnet**. Turn on **Assign a public IPv4 address**.
   - **Add SSH keys → Paste public keys** → paste the line you copied.
   - **Boot volume:** optionally set 100 GB (Always Free covers 200 GB in total).
   - Click **Create**.
4. **If you see "Out of capacity for shape VM.Standard.A1.Flex"** (this is common):
   - Try again later. Early morning IST and late night often work, and capacity frees up through the day.
   - Try a smaller shape first (**1 OCPU / 6 GB**), then resize it later (**Instance → Edit → Shape**).
   - Upgrading the account to **Pay As You Go** (**☰ → Billing → Upgrade and manage payment**) makes capacity much easier to get. Always Free resources still cost ₹0. If you upgrade, set a **budget alert** of ₹1 under **Billing → Budgets**.
   - If you still can't get a VM after a few days, use the Heroku backup in `deploy/heroku/README.md` and skip steps 4–5.
5. When the instance is **Running**, copy its **Public IP address** into your notes.
6. **Open ports 80 and 443 in Oracle's cloud firewall:**
   **Instance → Primary VNIC → Subnet → Security → Default Security List → Add Ingress Rules**. Add two rules, both with Source CIDR `0.0.0.0/0`, IP Protocol **TCP**, Destination Port **80** and **443**.
   - *Why:* Oracle blocks traffic in two places, here and in the VM's iptables. `setup.sh` handles the iptables side.
7. *(Optional)* To make the IP survive deleting the VM: **Primary VNIC → IPv4 Addresses → ⋯ → Edit → Reserved public IP**.

✅ `ssh -i ~/.ssh/oracle_nexora ubuntu@<VM_IP>` logs you in.

## 5. Run setup.sh on the VM

On the VM, as the `ubuntu` user:

```bash
curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/oracle/setup.sh -o setup.sh
sudo bash setup.sh
```

The script installs swap, Node 22, pm2, Docker, Piston and its language runtimes, and Caddy. It opens 80/443 in iptables, creates the `deploy` user, clones the app to `/opt/nexora` and runs `npm ci`. The first run takes 15–40 minutes, mostly the Piston runtimes.

- **If the repo is private,** the clone fails. The script prints a public key and tells you what to do: add it on GitHub under **repo → Settings → Deploy keys → Add deploy key** (read-only), then run `sudo REPO_URL=git@github.com:Gurudeep306/Nexora.git bash setup.sh`.
- On the first run the script stops after creating `/opt/nexora/.env`, because the database isn't configured yet. That's expected; go to step 6.

**Piston on ARM: read this.** Piston's official package repository ships language builds for x86-64. The Oracle A1 VM is ARM (aarch64). `setup.sh` builds the Piston server for ARM and installs the packages, then runs a smoke test that executes a tiny program in every language. Only the languages that really work go into `PISTON_LANGUAGES` in `.env`. Every other language, and every run while Piston is down, goes to Wandbox exactly as on Render today. If nothing passes, the script sets `JUDGE_MODE=remote` for you. Either way, every language keeps working. You can re-check at any time:

```bash
cd /opt/nexora && sudo -u deploy node deploy/oracle/piston-smoke.js
```

## 6. Fill in /opt/nexora/.env and start the API

```bash
sudo -u deploy nano /opt/nexora/.env
```

The script already generated `SESSION_SECRET` and `STUDIO_PASSWORD`. Fill in at least:

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`: same values as in Render (**Render → nexora → Environment**).
- `GROQ_API_KEY`: same as Render.
- `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`: same as Render (you update the callback URLs in step 12).

Save with Ctrl+O, Enter, Ctrl+X. Then run the script again. It's safe to repeat:

```bash
sudo bash setup.sh
```

✅ It ends with a JSON line like `{"ok":true,…,"db":"libsql"}` and **API healthy on 127.0.0.1:3000**. `db` must be `libsql`. If it shows `sqlite3`, the Turso URL is missing.

The "what each env var is for" table is at the end of this runbook.

## 7. Cloudflare Pages: the website

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Authorize GitHub, pick **Gurudeep306/Nexora** → **Begin setup**.
3. Settings:

   | Field | Value |
   |---|---|
   | Project name | `nexoraguru` (gives `nexoraguru.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory (advanced) | `client` |

4. **Environment variables (advanced) → Add variable** for **Production**:

   | Variable | Value |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `VITE_API_URL` | `https://api.nexoraguru.in` |
   | `VITE_SENTRY_DSN` | *(optional, step 14)* |

5. **Save and Deploy.** The build takes about 2–4 minutes. Pages installs the dependencies (`npm ci`) by itself. It also writes `_headers` (security headers and caching) and `_redirects` (OAuth, `/uploads`, `/studio` and the other server-only paths go to the API host). The GATE figures (`public/gate-fig`) are copied into the build. The output is about 1,350 files and 45 MB, well under the Pages limits of 20,000 files and 25 MiB per file.
6. **Settings → Builds → Branch control → Preview branches: None.** Preview URLs on `*.pages.dev` are a different site from `api.nexoraguru.in`, so logins can't work there.
7. *(Optional)* **Settings → Builds → Build watch paths → Include:** `client/*`, `public/gate-fig/*`. This skips site rebuilds for server-only commits.

✅ `https://nexoraguru.pages.dev` loads (API calls fail until step 9; that's expected).

**Pages and CI:** Pages builds every push to `main` by itself and doesn't wait for GitHub Actions. That's fine because CI runs the same client build. If CI fails, fix it quickly or roll back the deployment under **Pages → Deployments → ⋯ → Rollback**.

## 8. Attach nexoraguru.in and www to Pages

Do this once the domain is **Active** (step 2).

1. **Workers & Pages → nexoraguru → Custom domains → Set up a custom domain** → `nexoraguru.in` → **Continue → Activate domain**. Cloudflare creates a proxied `CNAME nexoraguru.in → nexoraguru.pages.dev` (orange cloud).
2. **DNS → Records → Add record:** Type `CNAME`, Name `www`, Target `nexoraguru.pages.dev`, **Proxied (orange)** → Save.
3. **Rules → Redirect Rules → Create rule → template "Redirect from WWW to root"**. Or create it by hand:
   - When incoming requests match: **Hostname equals `www.nexoraguru.in`**
   - Then: **Dynamic** redirect, expression `concat("https://nexoraguru.in", http.request.uri.path)`, status **301**, **Preserve query string** ✔ → Deploy.

✅ `https://nexoraguru.in` shows the site, and `https://www.nexoraguru.in/problems` redirects to `https://nexoraguru.in/problems`.

## 9. DNS for the API: api.nexoraguru.in → the VM

1. **DNS → Records → Add record:** Type `A`, Name `api`, IPv4 `<VM_IP>`, **Proxy status: DNS only (grey)** → Save.
   - *Why grey first:* Caddy must get its first Let's Encrypt certificate straight from the VM.
2. On the VM, watch Caddy fetch the certificate (about 1 minute):
   ```bash
   sudo journalctl -u caddy -f        # look for "certificate obtained successfully"; Ctrl+C to stop
   ```
   If nothing happens: `sudo systemctl reload caddy`.
3. From your Mac: `curl https://api.nexoraguru.in/api/health` → `{"ok":true,…}`.
4. Switch the `api` record to **Proxied (orange)** → Save.
   - *Why orange:* it hides the VM's IP, gives DDoS protection, and serves `/uploads` images from Cloudflare's cache. WebSockets (socket.io) and server-sent events (the AI chat) work through the proxy. Caddy reads the real visitor IP from Cloudflare (`trusted_proxies` in the Caddyfile), so rate limits apply per visitor, not per Cloudflare server. Renewals keep working over HTTP because "Always Use HTTPS" is off (step 3).
   - If anything misbehaves while it's orange, grey works too. The only cost is that the VM's IP is visible.

✅ `curl -s https://api.nexoraguru.in/api/health` still returns `{"ok":true,…}` with the orange cloud on.

## 10. GitHub Actions: auto-deploy the API

1. On your Mac, make a key that GitHub uses to log in to the VM:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/nexora_actions -N "" -C "github-actions-deploy"
   cat ~/.ssh/nexora_actions.pub
   ```
2. On the VM, allow it for the `deploy` user:
   ```bash
   echo 'PASTE_THE_.pub_LINE_HERE' | sudo tee -a /home/deploy/.ssh/authorized_keys
   ```
3. Back on the Mac, grab the VM's host key: `ssh-keyscan -t ed25519 <VM_IP>`.
4. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:

   | Secret | Value |
   |---|---|
   | `ORACLE_HOST` | the VM IP |
   | `ORACLE_USER` | `deploy` |
   | `ORACLE_SSH_KEY` | the whole content of `~/.ssh/nexora_actions` (the private file, including the BEGIN/END lines) |
   | `ORACLE_KNOWN_HOSTS` | the `ssh-keyscan` output line |
   | `TURSO_DATABASE_URL` | for the nightly backup (may already exist) |
   | `TURSO_BACKUP_TOKEN` | a **read-only** Turso token (`turso db tokens create nexora --read-only`) |

5. *(Optional)* **Variables** tab → `API_HEALTH_URL` = `https://api.nexoraguru.in/api/health` (this is already the default).
6. **Actions → Deploy API (Oracle) → Run workflow** to test it.

✅ The run is green. Its last step prints health JSON with `"commit":"<sha>"`. From now on every push to `main` runs **CI → Deploy API**: the VM checks out the tested commit, runs `npm ci --omit=dev` and `pm2 reload`. If the new version isn't healthy within 60 s, the workflow rolls the VM back to the previous commit and fails. Without the secrets, the job skips itself and shows green.

The **Nightly backup** workflow (`backup-turso.yml`) saves a gzipped copy of the Turso database every night at 03:00 IST as a private artifact for 14 days. Find it under **Actions → Nightly backup → a run → Artifacts**. To restore: `npm run db:push-to-cloud -- nexora.db --force`.

## 11. Allow the site in the API (already done if you kept the defaults)

The VM's `.env` already contains:

```
API_URL=https://api.nexoraguru.in
PUBLIC_URL=https://nexoraguru.in
CLIENT_ORIGINS=https://nexoraguru.in,https://www.nexoraguru.in
```

If you change any of these: `sudo -u deploy pm2 reload nexora --update-env`.

## 12. Update the OAuth apps (GitHub and Google login)

Logins now start and finish on the API host and land back on the site.

**GitHub:** https://github.com/settings/developers → **OAuth Apps** → your app:
- **Homepage URL:** `https://nexoraguru.in`
- **Authorization callback URL:** `https://api.nexoraguru.in/auth/github/callback`
- **Update application.** GitHub allows only one callback per app. Create a second OAuth app for Render/staging (callback `https://<render-host>/auth/github/callback`) and put its ID/secret in Render's environment.

**Google:** https://console.cloud.google.com/apis/credentials → your **OAuth 2.0 Client ID**:
- **Authorized JavaScript origins:** add `https://nexoraguru.in` and `https://api.nexoraguru.in`
- **Authorized redirect URIs:** add `https://api.nexoraguru.in/auth/google/callback`. Keep the Render one; Google allows several.
- **Save.** Also update the **OAuth consent screen**: App domain/homepage `https://nexoraguru.in`, Authorized domains `nexoraguru.in`.

✅ On https://nexoraguru.in → Sign in → **GitHub** → you return to `https://nexoraguru.in/?auth=github` and you're signed in.

## 13. UptimeRobot monitors

https://uptimerobot.com → **+ New monitor** (free plan: 5-minute checks):

| Type | Friendly name | URL | Extra |
|---|---|---|---|
| **Keyword** | API health | `https://api.nexoraguru.in/api/health` | Keyword `"ok":true`, alert when **not exists** |
| HTTP(s) | Website | `https://nexoraguru.in` | — |
| HTTP(s) | Staging (Render) | `https://<render-host>/api/health` | also keeps the free Render service awake |

Add your email (and the mobile app, if you like) as an **Alert contact**. Optionally make a free **Status page** at `status.nexoraguru.in` (UptimeRobot shows you the CNAME to add in Cloudflare, grey cloud).

## 14. Sentry error tracking (optional)

1. https://sentry.io → sign up (free Developer plan) → **Create project → Node.js** → copy the **DSN**.
2. VM: put it in `/opt/nexora/.env` as `SENTRY_DSN=…`, then `sudo -u deploy pm2 reload nexora --update-env`. The log shows `✓ Sentry error reporting on`.
3. *(Browser errors)* **Create project → Browser JavaScript** → copy its DSN → Cloudflare **Pages → Settings → Variables and secrets** → add `VITE_SENTRY_DSN` → **Deployments → Retry deployment** (Vite bakes it in at build time).
   - With no DSN set, the Sentry code isn't in the site bundle at all.

## 15. Verify everything

Go through these in a private browser window:

- [ ] `https://nexoraguru.in` loads, the padlock shows a valid certificate, and `http://` and `www.` both redirect to `https://nexoraguru.in`.
- [ ] Register a test account → you land on the hub. Reload the page and you're still signed in (the session cookie works across site and API).
- [ ] Sign out and in with GitHub and with Google.
- [ ] **Social** page shows **Socket live**. Send a DM between two accounts in two browsers; it arrives instantly.
- [ ] **GATE → Practice** → a question with a figure, e.g. GATE CSE 2026 Set 1 → GA Q2: the figure shows.
- [ ] Solve a problem in C++, Python and Java → **Run** and **Submit** give verdicts. The response has `engine: "piston"` (or `wandbox` for languages Piston doesn't have).
- [ ] Upload an avatar → it shows (served from `api.nexoraguru.in/uploads/…`).
- [ ] AI tutor answers (Groq).
- [ ] `https://api.nexoraguru.in/api/health` shows `"env":"production","db":"libsql"`.
- [ ] Push a small commit → **CI** goes green → **Deploy API (Oracle)** goes green → the Pages deployment finishes.
- [ ] UptimeRobot shows every monitor **Up**.
- [ ] Optional: https://securityheaders.com/?q=nexoraguru.in shows grade A.

Useful VM commands:

```bash
sudo -u deploy pm2 status                  # is it running?
sudo -u deploy pm2 logs nexora             # live logs (Ctrl+C to stop)
sudo -u deploy pm2 reload nexora --update-env
sudo systemctl status caddy ; sudo tail -f /var/log/caddy/api.log
docker logs --tail 50 piston
cd /opt/nexora && sudo -u deploy git log -1 --oneline   # what's deployed
```

## 16. Rollback plan

Render keeps running the same code from `main` (CI-gated), so it's always ready. **Prepare once, now:** Render → **nexora → Settings → Custom Domains** → add `api.nexoraguru.in`, plus `nexoraguru.in` and `www.nexoraguru.in` for plan B. Render shows a verification target for each. Also add these Render environment variables: `CLIENT_ORIGINS=https://nexoraguru.in,https://www.nexoraguru.in`, `PUBLIC_URL=https://nexoraguru.in`, `API_URL=https://api.nexoraguru.in`. Without a custom domain pointing at it they change nothing visible.

**Plan A: the VM is down; keep the site on Pages and move only the API** (about 5 minutes):
1. Cloudflare → DNS → edit `api`: type **CNAME**, target `nexora-xxxx.onrender.com`, **DNS only (grey)** → Save.
2. Wait until Render shows the certificate for `api.nexoraguru.in` as issued (a few minutes).
3. OAuth callbacks stay `https://api.nexoraguru.in/auth/...`, so nothing changes at GitHub or Google.
4. The judge falls back to Wandbox on Render (`JUDGE_MODE=remote`), and Render's free plan sleeps, so keep the UptimeRobot monitor on it.

**Plan B: put everything back on Render:**
1. **Pages → Custom domains** → remove `nexoraguru.in`.
2. DNS: `CNAME @ → nexora-xxxx.onrender.com` and `CNAME www → nexora-xxxx.onrender.com`, both **grey**. Point `api` at Render too (Plan A) or delete it.
3. On Render, set `PUBLIC_URL=https://nexoraguru.in` and `API_URL=https://nexoraguru.in` (one host again), and put the OAuth callbacks back to `https://nexoraguru.in/auth/{github,google}/callback`.

**Undo a bad deploy only:** GitHub → **Actions → Deploy API (Oracle)** → re-run the last good run. Or on the VM: `cd /opt/nexora && sudo -u deploy git checkout <good-sha> && sudo -u deploy npm ci --omit=dev && sudo -u deploy pm2 reload nexora`. For the site, use **Pages → Deployments → ⋯ → Rollback to this deployment**.

---

## What each env var is for

**API server** (`/opt/nexora/.env` on the VM; Render/Heroku environment):

| Variable | Example | What it does |
|---|---|---|
| `NODE_ENV` | `production` | Production mode: secure cookies, HSTS, Turso database, strict checks. |
| `PORT` | `3000` | Port Node listens on (Caddy forwards to it). |
| `API_URL` | `https://api.nexoraguru.in` | Public address of the API. OAuth callback URLs are built from it. Default: `APP_URL`. |
| `PUBLIC_URL` | `https://nexoraguru.in` | The website. After a GitHub/Google login the browser goes back here. Default: same host. |
| `APP_URL` | `https://api.nexoraguru.in` | Older name for this server's URL. Used in logs and as an allowed origin. Render sets it automatically. |
| `CLIENT_ORIGINS` | `https://nexoraguru.in,https://www.nexoraguru.in` | Sites allowed to call the API with cookies (CORS and socket.io). Empty = old behaviour. Old name: `ALLOWED_ORIGINS`. |
| `COOKIE_DOMAIN` | *(empty)* or `.nexoraguru.in` | Shares the login cookie across subdomains. Not needed for this setup. |
| `TRUST_PROXY` | `1` | How many proxies in front of Node to trust for the visitor IP (Caddy = 1). |
| `SESSION_SECRET` | 64 hex chars | Signs login sessions. `openssl rand -hex 32`. Changing it signs everyone out. |
| `STUDIO_PASSWORD` | random | Password for the `/studio` admin tool. Required in production. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | `libsql://…turso.io` / token | The cloud database. |
| `GITHUB_CLIENT_ID` / `_SECRET` | from GitHub | "Sign in with GitHub". Empty = button hidden. |
| `GOOGLE_CLIENT_ID` / `_SECRET` | from Google | "Sign in with Google". |
| `GROQ_API_KEY` | `gsk_…` | All AI features. Empty = AI answers 503. |
| `GROQ_MODEL`, `GROQ_FAST_MODEL`, `GROQ_FALLBACK_MODEL`, `AI_DAILY_TOKENS` | see `.env.example` | AI model choice and per-user daily budget. |
| `JUDGE_MODE` | `piston` / `remote` | Where submitted code runs. `piston` = local Piston first, Wandbox as fallback. `remote` = public sandboxes only. Never `local` on a server. |
| `PISTON_URL` | `http://127.0.0.1:2000` | Address of the Piston container. |
| `PISTON_LANGUAGES` | `cpp,python,…` | Languages Piston answers for (written by the smoke test). Empty = all mapped ones. |
| `PISTON_RUN_TIMEOUT_MS` / `PISTON_COMPILE_TIMEOUT_MS` | `10000` / `30000` | Per-run limits sent to Piston. |
| `DISABLE_PUPPETEER`, `PUPPETEER_SKIP_DOWNLOAD` | `1` | No headless Chrome on the server. |
| `UPLOAD_PERSIST_MAX_MB` | `50` | Largest upload also stored in the database (so it survives redeploys). |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | DSN / `production` | Server error reporting. Empty = Sentry not loaded. |
| `GIT_COMMIT` | *(set by the deploy workflow)* | Shown as `commit` in `/api/health`. The workflow uses it to confirm the new version is live. |

**Website build** (Cloudflare Pages → Settings → Variables):

| Variable | Example | What it does |
|---|---|---|
| `NODE_VERSION` | `22` | Node version for the Pages build. |
| `VITE_API_URL` | `https://api.nexoraguru.in` | Where the browser sends API, socket.io, OAuth and upload requests. Empty = same origin (local dev, Render). |
| `VITE_SENTRY_DSN` | DSN | Browser error reporting. Empty = Sentry left out of the bundle. |

**GitHub Actions secrets:** `ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`, `ORACLE_KNOWN_HOSTS` (deploy); `TURSO_DATABASE_URL`, `TURSO_BACKUP_TOKEN` (nightly backup). Variable: `API_HEALTH_URL`.
