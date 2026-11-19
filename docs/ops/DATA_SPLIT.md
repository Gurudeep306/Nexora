# The data split

The site's data is in five **stores**. Each one can live in a database of its
own, so heavy work in one part (big uploaded files, Hive's agents writing all
day) never slows the pages students use.

| Store | What is in it | Why it is separate |
|---|---|---|
| **core** | users, logins, progress, submissions, problems, GATE, Nexus, social | Everything a student's pages read. Joined together a lot, so it stays one database. |
| **hive** | every `hive_*` table (staff AI workspace) | Very busy with writes; only staff use it. |
| **files** | `uploads`, `upload_chunks`, `statement_media`, `statement_media_chunks` | Large binary chunks. Keeps core small and its backups fast. |
| **cache** | `translation_cache`, `catalog_snapshot` | Can always be rebuilt. |
| **logs** | `audit_log`, `code_replays` | Only ever grows; rarely read. |

The list is in `src/db-stores.js`. `catalog_meta` stays in core because the
triggers on `problems` update it, and a trigger can only write to its own
database.

## How it works

- With no extra settings the site is one database, exactly as before.
- Set `TURSO_<STORE>_URL` (for example `TURSO_FILES_URL`) and that store's
  tables are read and written there. `TURSO_<STORE>_AUTH_TOKEN` is optional:
  a Turso **group** token in `TURSO_AUTH_TOKEN` works for every database in
  the group.
- `src/db.js` picks the database for each statement from the tables it names.
  No query joins two stores: `node scripts/ops/sql-table-groups.cjs` checks all
  1,700+ statements in `src/` (including triggers); `tests/db-split.test.js` runs it.
- `runBatch` is all-or-nothing inside one database. A test checks that no
  batch which changes data spans two stores. Only boot-time `CREATE TABLE`
  batches do, and those are simply sent per database.
- Renaming a user and the nightly backup cover every store. The backup still
  writes **one** file with every table, so a restore works as before.

## Local copies on the server (the biggest speed-up)

On a server with a lasting disk (the Oracle VM), set
`TURSO_REPLICA_DIR=/opt/nexora/data/replicas`. Each database then keeps a copy
on the VM's disk that Turso keeps in sync (every `TURSO_SYNC_SECONDS`, default
15):

- **Reads** come from the disk, in microseconds, instead of a network round trip.
- **Writes** still go to Turso first, and this server sees its own writes at once.
- If the first sync fails at boot, the server stops with a clear message
  rather than show an empty copy. To run without local copies, remove
  `TURSO_REPLICA_DIR`.
- Use it with **one** server process (the Oracle setup runs one). Two processes
  must not share one replica folder.

Not on Render: its disk is wiped on every restart, so the copy would be
downloaded again on each boot.

## Moving a store out (step by step)

Do this at a quiet time. Moving a store takes a few minutes per store. Move
**files** first (it is the largest), then **logs**, then **hive**. **cache** is
small; moving it is optional.

1. **Make the new database** in the same place as the main one (Mumbai after
   step 4b of `docs/deploy/LAUNCH_RUNBOOK.md`). On your Mac:
   ```bash
   turso db create nexora-files --group <your-group>
   ```
   Check the flags with `turso db create --help`. `turso group list` shows
   your group's name. Get the address:
   ```bash
   turso db show nexora-files --url
   ```
2. **Stop the server** so nothing is written during the copy (on the VM):
   ```bash
   sudo -u deploy pm2 stop nexora
   ```
3. **Back up** (on your Mac, in the Nexora folder, with the live
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env`):
   ```bash
   npm run db:backup
   ```
4. **See what will move** (a dry run changes nothing):
   ```bash
   TURSO_FILES_URL=libsql://nexora-files-<you>.turso.io node scripts/ops/split-db.cjs --store files
   ```
5. **Copy it.** The script checks that every table has the same number of
   rows in both places, and stops if not:
   ```bash
   TURSO_FILES_URL=libsql://nexora-files-<you>.turso.io node scripts/ops/split-db.cjs --store files --apply
   ```
6. **Point the server at it.** On the VM, add the line to `/opt/nexora/.env`:
   ```
   TURSO_FILES_URL=libsql://nexora-files-<you>.turso.io
   ```
   Then start it:
   ```bash
   sudo -u deploy pm2 start nexora --update-env
   ```
7. **Check:** open the site, sign in, and open a page with your avatar.
   `https://api.nexoraguru.in/api/health` should say `"ok": true`.
8. **Add the secret for the nightly backup:** GitHub → Settings → Secrets and
   variables → Actions → New secret `TURSO_FILES_URL`.
9. **A week later**, once all is well, remove the old copies from the main
   database (the script checks the counts again first):
   ```bash
   TURSO_FILES_URL=libsql://nexora-files-<you>.turso.io node scripts/ops/split-db.cjs --store files --drop-old
   ```

**To undo** before step 9: remove the `TURSO_FILES_URL` line and restart. The
old tables are still in the main database. Anything uploaded after the move
would then be missing, so undo soon or copy those rows back.

## Limits to know

- Each Turso plan allows a set number of databases and a monthly amount of
  storage and row reads. Check yours with `turso plan show` before you add
  databases.
- `tests/db-split.test.js` checks the move from start to finish against a local
  stand-in for Turso: sign up, upload, move two stores, restart on three
  databases, and confirm the login and the file are still there. The local
  copies (`TURSO_REPLICA_DIR`) need the real Turso sync service, which the
  stand-in does not speak. Try them on the VM first, with the fallback above.
