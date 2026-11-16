# Our own code runners (Piston): fast, and backed up

Every Run and Submit goes through a chain of runners (`src/remote-exec.js`):

1. **Our own runners** (Piston), when set up. You can have several:
   Oracle, Hetzner and AWS at once. Each one backs up the others.
2. **Free public sandboxes**: Wandbox, Compiler Explorer, the Kotlin
   Playground and Paiza.io.

A runner that is busy, down or silent is skipped and rested for a while
(30 s, doubling to 5 min), so one machine going down never stops a run. A
real verdict (wrong answer, compile error, crash, time limit) is never
re-run elsewhere. If every runner is down, the student is told it is not
their code.

Without our own runners, 31 of 36 languages work (checked 2026-11-16).
Our own runners add Clojure, PowerShell, Groovy and Nim, and make every
language fast (about 1 s to compile instead of 5–40 s). Tcl is not offered
by Piston, so it stays unavailable.

## Which machines (honest costs)

| Where | Machine | Cost | Notes |
|---|---|---|---|
| Oracle Cloud | Always Free, Ampere A1 (ARM), 2 OCPU / 12 GB | Free | Needs a card to sign up (not charged). Free machines can be hard to get in busy regions, and Oracle may reclaim one that sits idle. A few Piston packages are x86-only; those languages just pass to the next runner. |
| Hetzner | CX22, 2 vCPU / 4 GB, x86 | about €4–5 a month | Cheapest paid machine that runs every language. |
| AWS | t3.small, 2 vCPU / 2 GB, x86 | about $15 a month | Must be a **new** machine, never `hive-worker`: student code must not run next to the AI logins. |

The prices are what the providers listed in late 2026. The order page shows
the real price before you pay. Nothing here is set up without the owner's yes.

## Setting up one runner (same for every provider)

You need: a fresh **Ubuntu 24.04** machine with ports **22, 80 and 443** open.

1. Open a terminal on the machine (each provider has a "Console" or "SSH" button).
2. Paste these two lines:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Gurudeep306/Nexora/main/deploy/runner/setup.sh -o setup.sh
   ```

   ```bash
   sudo bash setup.sh
   ```

3. Wait 10–30 minutes. At the end it prints two lines, `PISTON_URL` and
   `PISTON_TOKEN`. Keep them. (Show the password again: `sudo cat /opt/piston/token`.)

The script installs Docker, Piston, every judge language, and HTTPS with a
password check. It needs no domain: it uses the free `<ip>.sslip.io` name.
Running it again is safe.

### Oracle (free)

1. Sign up at cloud.oracle.com → choose your home region (pick one close to
   India, e.g. Mumbai or Hyderabad).
2. Menu → Compute → Instances → **Create instance**.
3. Image: **Canonical Ubuntu 24.04**. Shape: **Ampere → VM.Standard.A1.Flex**,
   2 OCPU, 12 GB memory.
4. Networking: keep "Assign a public IPv4 address". Add your SSH key (or let
   it make one and download it). **Create**.
5. Open the ports: on the instance page click the **subnet** → the **Default
   Security List** → **Add Ingress Rules**: Source `0.0.0.0/0`, TCP,
   destination port `80,443`.
6. Click **Cloud Shell** or SSH in, and run the two lines above.

If it says "Out of capacity", try again later or another availability domain.

### Hetzner (about €4–5 a month)

1. Sign up at hetzner.com/cloud → **New project** → **Add server**.
2. Location: any (Helsinki or Falkenstein are fine; Singapore is closest to India
   but costs more). Image: **Ubuntu 24.04**. Type: **Shared vCPU → x86 → CX22**.
3. Add your SSH key. **Create & Buy now**.
4. Hetzner has no firewall on by default, so ports are already open.
5. Click **>_ Console** on the server, log in, and run the two lines above.

### AWS (about $15 a month)

1. AWS console → region **Asia Pacific (Mumbai)** → **EC2** → **Launch instance**.
2. Name `nexora-runner`. Image: **Ubuntu Server 24.04**. Type: **t3.small**.
3. Key pair: create or choose one. Network settings: tick **Allow HTTPS** and
   **Allow HTTP** from the internet. Storage: 30 GB.
4. **Launch**. Then **Connect → EC2 Instance Connect → Connect**, and run the
   two lines above.

Do not reuse `hive-worker`.

## Tell Nexora about the runners

Render → the `nexora` service → **Environment**:

| Name | Value |
| --- | --- |
| `JUDGE_MODE` | `piston` |
| `PISTON_URL` | every runner's address, joined by commas, fastest first: `https://1-2-3-4.sslip.io,https://5-6-7-8.sslip.io` |
| `PISTON_TOKEN` | the passwords in the same order, joined by commas: `tokenA,tokenB` |
| `PISTON_LANGUAGES` | leave empty (each runner passes on any language it lacks) |

Save; Render restarts the site.

## Check it

- Open any problem, pick C++, press **Run**. The result shows which runner
  answered: "Nexora runner", "Nexora runner 2", … or a public sandbox.
- Admin: `GET /api/admin/judge-selftest` runs every language and shows each
  language's runner chain and which runners are resting.

## If something goes wrong

- A runner down or its password wrong: runs pass to the next runner, then the
  public sandboxes. The site keeps working, just slower.
- To stop using our runners, set `JUDGE_MODE` back to `remote` in Render.
- To remove one runner, delete its address and password from both lists.
