# Make code run fast: your own Piston runner

Today every Run and Submit goes to free public sandboxes (Wandbox, Compiler
Explorer). Each test is a fresh compile on a shared machine, so C++ takes
several seconds and Rust or Haskell can take 40 seconds when those sites are
busy. Nexora already supports a faster option: **Piston**, an open-source code
runner, on a machine you control. Compiles then take about a second, and
nothing leaves your servers.

The site keeps working without it. Every language has a chain of runners
(`src/remote-exec.js`): Piston first when it is set up, then the free public
sandboxes — Wandbox, Compiler Explorer, the Kotlin playground and Paiza.io —
in turn. A runner that fails (busy, down, no answer) is skipped for a while,
so one service going down never stops a run.

## What you need

- A small Linux machine that is always on, **separate from the machine where
  your Claude and Mistral accounts are logged in** (user code must never run
  next to your logins). 2 vCPU and 4 GB RAM is enough; an AWS t3.medium or
  any cheap VPS works.
- A domain name for it, e.g. `run.nexoraguru.in`, pointing at its IP address.

## Steps

1. On the new machine, install Docker:

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. Start Piston with the same limits Nexora's own setup uses
   (`deploy/oracle/piston-compose.yml` in this repo). Copy that file to the
   machine, then:

   ```bash
   sudo mkdir -p /opt/piston/packages && sudo docker compose -f piston-compose.yml up -d
   ```

   It listens only on the machine itself (127.0.0.1:2000).

3. Install the languages. This picks the newest version of each, the same
   way `deploy/oracle/setup.sh` does (needs `jq`: `sudo apt install -y jq`):

   ```bash
   INDEX=$(curl -s localhost:2000/api/v2/packages); for p in gcc python java node typescript mono go rust kotlin ruby php perl lua bash rscript scala swift dart pwsh julia dotnet clojure freepascal elixir haskell ocaml dmd nim zig crystal groovy sbcl; do v=$(echo "$INDEX" | jq -r --arg n $p '[.[]|select(.language==$n)|.language_version]|.[]' | sort -V | tail -1); [ -n "$v" ] && curl -s -m 900 -X POST localhost:2000/api/v2/packages -H 'Content-Type: application/json' -d "{\"language\":\"$p\",\"version\":\"$v\"}" && echo " $p $v"; done
   ```

4. Make a long random password for the runner and keep it:

   ```bash
   openssl rand -hex 32
   ```

5. Put Caddy in front so only Nexora (holding that password) can use it.
   Install Caddy (`sudo apt install caddy`), then replace `/etc/caddy/Caddyfile` with:

   ```
   run.nexoraguru.in {
     @ok header Authorization "Bearer PASTE_THE_PASSWORD_HERE"
     handle @ok {
       reverse_proxy 127.0.0.1:2000
     }
     respond 401
   }
   ```

   Then `sudo systemctl reload caddy`. Caddy gets the HTTPS certificate by itself.

6. In Render → the `nexora` service → Environment, set:

   | Name | Value |
   | --- | --- |
   | `JUDGE_MODE` | `piston` |
   | `PISTON_URL` | `https://run.nexoraguru.in` |
   | `PISTON_TOKEN` | the password from step 4 |
   | `PISTON_LANGUAGES` | leave empty to use Piston for every language it has (`deploy/oracle/setup.sh` writes the list that passed its smoke test) |

   Save; Render restarts the site.

7. Check it: open any problem, pick C++, press Run. The result shows which
   engine ran it; it should say `piston`.

## If something goes wrong

- Piston down or the password wrong: runs quietly fall back to the public
  sandboxes, so the site keeps working — just slower.
- To turn it off, set `JUDGE_MODE` back to `remote` in Render.
