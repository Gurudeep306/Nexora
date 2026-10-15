# Backup API host: Heroku (GitHub Student Pack)

Use this only if Oracle has no Always Free ARM capacity in Mumbai/Hyderabad.
The website stays on Cloudflare Pages; only `api.nexoraguru.in` moves.

Heroku runs the app with `npm start` (= `node src/server.js`) and builds with
`npm run build`, so **no Procfile is needed** — it would only repeat the default.
Heroku has no Docker-in-dyno, so there is no Piston: use `JUDGE_MODE=remote`
(Wandbox etc.).

## 1. Credits and app

1. Claim the Heroku offer in the GitHub Student Developer Pack
   (https://education.github.com/pack → Heroku). It gives monthly platform credits.
2. https://dashboard.heroku.com → **New → Create new app** → name e.g. `nexoraguru-api`,
   region **Europe** or **United States** (Heroku has no India region on Common Runtime).
3. **Resources** → choose the **Eco** or **Basic** dyno (Basic does not sleep).
4. **Deploy → Deployment method → GitHub** → connect the repo → **Enable Automatic
   Deploys** from `main` with **Wait for CI to pass** ticked.

## 2. Config vars (Settings → Reveal Config Vars)

Same meaning as `deploy/oracle/.env.example`:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `API_URL` / `APP_URL` | `https://api.nexoraguru.in` |
| `PUBLIC_URL` | `https://nexoraguru.in` |
| `CLIENT_ORIGINS` | `https://nexoraguru.in,https://www.nexoraguru.in` |
| `JUDGE_MODE` | `remote` |
| `DISABLE_PUPPETEER`, `PUPPETEER_SKIP_DOWNLOAD` | `1` |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `STUDIO_PASSWORD`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `GROQ_API_KEY`, OAuth ids/secrets, `SENTRY_DSN` | as on the VM |

Heroku's router is one proxy hop, which matches the default `TRUST_PROXY=1`.

## 3. Custom domain

1. **Settings → Domains → Add domain** → `api.nexoraguru.in`. Heroku shows a
   **DNS target** like `xyz.herokudns.com`.
2. **Settings → SSL Certificates → Automatic Certificate Management** → on.
3. Cloudflare → DNS → edit the `api` record: type **CNAME**, target the
   Heroku DNS target, **DNS only (grey cloud)** until Heroku shows the
   certificate as issued, then you may switch it to **Proxied**.

OAuth callback URLs stay the same (`https://api.nexoraguru.in/auth/...`), so
nothing changes at GitHub/Google.

## 4. Deploy workflow

`.github/workflows/deploy-api.yml` skips itself when the `ORACLE_*` secrets are
absent, so with Heroku just leave them unset (or delete them).
