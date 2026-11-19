# Where the site runs (2026-11)

| Part | Where | Notes |
|---|---|---|
| Website + API | Azure VM `nexora-api`, region `indiasouthcentral` (India), size `Standard_B2ats_v2` (2 vCPU, 1 GB + 2 GB swap), Ubuntu 24.04 | Paid from the Azure for Students credit (no card on the account). One server answers `nexoraguru.in`, `www` and `api` through Caddy (HTTPS from Let's Encrypt). |
| Database | Turso `nexora-in`, group `india`, `aws-ap-south-1` (Mumbai) | The server keeps a synced local copy (`TURSO_REPLICA_DIR=/opt/nexora/data/replicas`), so reads come from its disk. The old `nexora` database (Virginia) is kept as a fallback for now. |
| DNS | Cloudflare (domain registered at GoDaddy) | `A @` and `A api` → the server, `CNAME www` → `nexoraguru.in`, all **DNS only** (grey) so Caddy can renew its certificates. |
| Render | Suspended | Was the host until 2026-11-19. |

## Deploys

Merging to `main` runs CI, then **Deploy site** (`.github/workflows/deploy-api.yml`):
it builds the pages on GitHub's runner, copies them to the server, checks out
the tested commit there, installs server packages and reloads pm2. If the new
version isn't healthy it rolls back. It needs the repository secrets
`DEPLOY_HOST`, `DEPLOY_USER` (`deploy`), `DEPLOY_SSH_KEY` and, optionally,
`DEPLOY_KNOWN_HOSTS`.

## Setting up a server from scratch

1. Ubuntu 24.04, ports 22, 80 and 443 open.
2. `curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/oracle/setup.sh -o setup.sh`
3. On a 1 GB server: `sudo ENABLE_PISTON=0 SWAP_SIZE=2G bash setup.sh` (code runs on the remote judge). With 4 GB or more, plain `sudo bash setup.sh` also installs Piston.
4. Fill `/opt/nexora/.env` (Turso URL and token, `SESSION_SECRET`, OAuth keys, …), set `API_URL`, `PUBLIC_URL` and `APP_URL` to `https://nexoraguru.in`, and run the script again.
5. In `/etc/caddy/Caddyfile`, serve `nexoraguru.in, www.nexoraguru.in, api.nexoraguru.in`.
6. Add the deploy key and secrets above, then run **Deploy site** once from the Actions tab: it puts the pages (`client/dist`) on the server.

## Turso: copying a database between locations

`turso db create … --from-dump` reported success but produced an empty
database for our 482 MB dump. What worked:

```bash
turso db shell nexora .dump > dump.sql
sqlite3 copy.db < dump.sql
turso db create nexora-in --group india --from-file copy.db
turso db shell nexora-in "select count(*) from users"   # compare with the source
```

Delete `dump.sql` and `copy.db` afterwards: they hold users' data.
