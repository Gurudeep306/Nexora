# Nexora Hive — guide

Hive is the staff-only AI workspace at **/hive** on the site. Use it to chat with any model, put several agents on a codebase, and ship their work as a pull request. Merged changes deploy to nexoraguru.in. It works from any browser, including a phone.

## Find your way around

| Where | What it's for |
|---|---|
| **Mission control** (Home) | One box to ask a model or start a session in a project. Shows live agents, commands waiting for approval, recent sessions, today's usage and new models. |
| **Chat** | Talk to any connected model. Attach images, PDFs, code or repo files, and make images. **Compare** asks up to 4 models the same question side by side; pick the answer the chat continues from. Each chat can have its own instructions; you can share it with staff or export it as Markdown. |
| **Projects** | A project is a codebase: a GitHub repo, extra linked repos, and optionally a folder on a machine. The project page shows its *pulse* (CI on the default branch, open PRs, deploys, live-site health) and lists its sessions. |
| **Sessions** | One piece of work by one or more agents. See below. |
| **Launchpad** | Describe an idea and get a plan (product, stack, architecture, milestones). **Launch** creates the repo, PLAN.md and project memory, and starts milestone 1. |
| **Machines** | Computers running the Hive bridge. On a machine, agents work on real folders and run commands, tests and dev servers. |
| **Model radar** | Models that recently appeared on your keys, plus the newest models across all labs. |
| **Keys** | AI keys (any number per provider), budgets, live rate limits and GitHub connections. |

Shortcuts:
- **⌘K**: search and actions
- **⌘J**: new chat
- **⌘⇧I**: new idea
- **⌘B**: toggle the sidebar

## Sessions: many agents, one piece of work

- **Roster (left):** every agent, with its model, status, what it's doing right now, steps and tokens. Click an agent to filter the stream to it. **⇄** opens two actions:
  - **steer** a running agent;
  - **continue with any model**: the new agent gets the old one's instructions, notes and edits.
- **Stream (middle):** every agent's steps, colour-coded by agent. File edits show as diffs, commands show their output, and approval requests have **Run it / Deny** right there. Every agent added to a task is told who worked on it before, with which model, and what each one reported.
- **Timeline:** one track per agent. ◆ marks a checkpoint.
- **Command bar:** typing plain text adds an agent with your request. Slash commands:
  - `/add`: add an agent that works with the others
  - `/race`: try the request on its own copy
  - `/review`: read-only review of the changes
  - `/steer`: message the focused agent
  - `/run`: run a command on the machine
  - `/checkpoint`: save the current state
  - `/restore`: restore an earlier state
  - `/ship`: commit, open a PR and merge
- **Checkpoints:** a checkpoint is saved whenever an agent finishes or another one joins, and whenever you save one yourself. If the latest result isn't good, **Restore** an earlier one; the state you're leaving is saved first, so nothing is lost.
- **Ship:**
  1. Commit to a `hive/…` branch.
  2. Open a PR.
  3. Watch the CI checks live.
  4. An admin presses **Squash & merge**.
  5. Render deploys `main` automatically after CI passes.

## Work on NexoraGuru

Open **Build NexoraGuru** at the bottom of the sidebar (`/hive/nexora`). It's a live checklist:

1. **Add an AI key** (Keys). Add several if you like; Hive moves to another key when one hits its budget or a rate limit.
2. **Give GitHub access to the private repo.** Fine-grained tokens see private repos **only if you select them**. If you didn't, Nexora doesn't appear in the list. Set up the token like this:
   - **Resource owner:** Gurudeep306
   - **Repository access:** Only select repositories → `Nexora`
   - **Permissions:**
     - Contents: read & write
     - Pull requests: read & write
     - Actions: read
     - Commit statuses: read
     - Workflows: read & write, only if agents may edit `.github/workflows`

   **Check access** tells you exactly what's still missing.
3. **Open NexoraGuru as a project.**
4. **Teach the agents:** pins the stack, the checks to run, how deploys work, and the security and UI conventions into project memory, and watches `https://nexoraguru.in/api/health`.
5. **(Optional) A machine:** clone Nexora there so agents can run `npm test` and the client build themselves.
6. **Start a session.** Pick one of the suggested first jobs, or describe your own.
7. **Ship it:** PR → CI → merge → Render → live.

## Machines (the bridge)

Machines → **Connect a machine** gives you a one-line command, for example:

```bash
curl -fsSL -H "Authorization: Bearer hvm_…" https://nexoraguru.in/api/hive-bridge/script -o hive-bridge.js && node hive-bridge.js --server https://nexoraguru.in --token hvm_… --root ~/code
```

- **Requirements:** Node 18 or later. The bridge has no dependencies and needs no inbound port (it long-polls over HTTPS).
- **Folders:** agents can only reach folders under `--root`. Repeat `--root` to allow more than one.
- **Permissions, set per machine:**
  - **Ask me** (default): every command waits for a staff member's approval.
  - **Autonomous:** commands run without asking. Only use this on a throwaway VM.
  - **Read-only:** agents can read files but not write or run anything.
- **Running it 24/7:** run the bridge on a free always-on VM (for example Oracle's free ARM VM) under `pm2` or a systemd service. Agents then keep working when your laptop is off, and you approve commands from your phone.
- **Clone a project onto a machine:** use **Folders & clone**. It uses the project's GitHub token for that one command and never stores it. Pushes from machine sessions also pass the token per call.

## Keys and budgets

- **What counts:** a key's budget counts input and output tokens. **Prompt-cache reads are recorded separately and don't use the budget.** They are about 90% cheaper, and agents re-send their context on every step.
- **Each key card shows:**
  - remaining budget and when it resets
  - the provider's live rate limit and its reset time
  - 30-day usage, with cached tokens shown separately
  - today's tokens and estimated spend
- **Model lists:** every key's model list refreshes twice a day. A default model you picked yourself is kept; automatic defaults move to the best chat model the key currently offers.

## Running Hive locally without keys

```bash
node scripts/hive-demo.js
```

This starts a mock model and a mock GitHub, the real server, and a real bridge on a temporary git repo. Open `http://localhost:3300/hive` and sign in as `owner` / `owner123`. `tests/hive-v3.test.js` drives the same harness.
