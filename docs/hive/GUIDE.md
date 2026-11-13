# Nexora Hive — guide

Hive is the staff-only AI workspace at **/hive** on the site (staff see a **Hive** icon in the Dock). Use it to chat with any model, put teams of agents on a codebase, automate work overnight, and ship the results as pull requests. Merged changes deploy to nexoraguru.in. It works from any browser, including a phone.

**One shared workspace.** Every staff member sees every chat, session, pipeline and file, and every connected key, subscription and tool works for everyone. Only the person who started a chat (or an admin) can rename or delete it. Staff talk in **Team** (top right): `#general` plus one channel per project.

## Find your way around

| Where | What it's for |
|---|---|
| **Mission control** (Home) | One box to ask a model or start a session in a project. Shows live agents, commands waiting for approval, recent sessions, today's usage and new models. |
| **Chat** | Talk to any connected model, or leave it on **Auto** and Hive picks the right one. Attach images, PDFs, code, repo files or Drive files, and make images. With tools on (🌐 in the header) a model can search the web, read pages, read the project's code and Drive, use connected MCP tools, and **create documents** (PDF, Word, slides). You see each step live. **Compare** asks up to 4 models side by side; **Let the Judge pick** has a different model choose the best answer. 👍/👎 teach the router. **Export** saves the chat, or one answer, as PDF, Word, slides, a web page or Markdown. **✨ Improve** rewrites your prompt into a clear brief before you send it. |
| **Projects** | A project is a codebase: a GitHub repo, extra linked repos, and optionally a folder on a machine. The project page shows its *pulse* (CI on the default branch, open PRs, deploys, live-site health) and lists its sessions. |
| **Sessions** | One piece of work by one or more agents. See below. |
| **Launchpad** | Describe an idea and get a plan (product, stack, architecture, milestones). **Launch** creates the repo, PLAN.md and project memory, and starts milestone 1. |
| **Machines** | Computers running the Hive bridge. On a machine, agents work on real folders and run commands, tests and dev servers. |
| **Copilot** (⌘I, or the round button at the bottom right of every page) | Your chief of staff. Say what you want; it plans the work, writes the prompts, puts the right agents on it, watches, reads the changes, judges them, fixes what's missing and tells you when it's ready. It never ships without you. |
| **Dispatcher** | Describe the work. Hive splits it into parts by kind of work (reading, mechanical, coding, writing, review, hard engineering) and puts the cheapest model that can really do each part on it. You see the plan as a graph with each part's model and cost, next to "one premium model for everything". Swap any model, then **Start the team**: independent parts run in parallel, and a reviewer from another lab checks the whole change. |
| **Agent health** | Every connected agent: working, flaky, cooling down after errors, or down (bad key, no credit). Failing agents are skipped automatically and their work goes to the next best one. Free and plan agents are tested every 4 hours; **Test everything** checks them all now. |
| **Pipelines** | Relay teams of agents: plan → build → test → review → ship, with gates, fix loops and races judged by the Judge. Describe what you want to the **Architect** and it designs the pipeline. |
| **Automations** | Recurring work: nightly test fixing, dependency updates, security reviews, docs. They run on schedule, overnight too, and resume after restarts. |
| **Drive** | The team's file manager. Keep PDFs, designs, docs and data here; agents and chats can read them. Push files to GitHub as a branch or PR when they're done. |
| **Models** | *Who does what*: every model ranked by intelligence, coding, reasoning, writing, speed and price, plus what it's good and bad at. Live router picks per kind of work, **free sources**, side-by-side **compare**, and the model radar. |
| **Keys** | AI keys (any number per provider), **your subscriptions** (Claude Code and Codex on your plans), budgets, live rate limits and GitHub connections. |
| **Toolbox** | 300+ open-source AI tools from the team's research, each marked with how Hive uses it. Connect MCP servers and search engines, import skills, and see what's already built in. |
| **Token Steward** | An AI that keeps token spend low: an efficiency score, one-click savings, a "which model is enough?" sizer, and a Steward you can ask. |
| **Budgets** | Caps per project, provider, model or person (per day or month), with alerts at 80% and 100%. |

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

## Subscriptions: Claude Code and Codex without API credits

Claude and ChatGPT plans can't be used through an API key, so Hive runs the official CLIs on an **always-on worker machine** and drives them for you:

1. In **Machines**, add a machine and copy its token. On that computer (a mini PC, a home server or a small VPS), run:
   `curl -fsSL https://nexoraguru.in/api/hive-bridge/setup.sh | bash -s -- --server https://nexoraguru.in --token <token>`
   This installs Node, git, Claude Code and Codex, and keeps the bridge running as a service.
2. Log in once on that machine: `claude` (or paste a `claude setup-token` token in Hive), and `codex login --device-auth`.
3. In **Keys → Your subscriptions**, click **Connect**, then pick the machine. Hive checks that the CLI is installed and logged in.

After that, everyone can pick *Claude Code* or *Codex* in any agent picker, or let **Auto** use them, from any device. The plan's usage windows (5-hour and weekly) show in Keys. When a plan hits its limit, the work carries on with the best other model for the same kind of work, free models first.

## Toolbox: the open-source ecosystem

**Toolbox** lists 300+ open-source tools in 14 categories: gateways, MCP, coding agents, browser and search, documents, RAG and vector stores, agent frameworks and memory, automation, image and video, audio, local models, evals and cost, infrastructure, and developer integrations. Each one says how Hive uses it:

| Badge | What it means | What to do |
|---|---|---|
| **MCP** | A Model Context Protocol server | **Connect** with its remote URL (Streamable HTTP) and an optional token. Its tools appear in chat and for every agent; read-only agents only get read-only tools. Use **Try** to run a tool by hand. Servers that only run locally can be exposed through a gateway such as Docker MCP Gateway or MCPHub. |
| **Search** | Tavily, Exa, Brave, SearXNG, Jina Reader, Firecrawl | **Connect** with a key (or your SearXNG URL). Web search uses it first; Jina and Firecrawl also read JavaScript-heavy pages. |
| **Models** | An OpenAI-compatible endpoint (LiteLLM, Bifrost, vLLM, LocalAI, llama.cpp, Ollama, OpenRouter…) | **Add in Keys**. The router can then use it like any other model. |
| **Skill** | A SKILL.md or rules pack (Superpowers, wshobson/agents…) | **Import** from a GitHub link. Long skills are condensed by a free model. The result is a plugin every agent follows. |
| **Built in** | Hive already does this (repo map, prompt caching, memory, web reader, documents, Judge…) | Nothing to install. |
| **Machine** | A CLI that runs next to the bridge (Aider, OpenCode, Gemini CLI…) | Install it on a worker machine. |
| **Reference** | Useful to know | Open the project. |

**Directories** links to curated lists with thousands more servers and skills. Secrets are encrypted, and connected tools are shared by the whole team. Only public hosts can be connected; set `HIVE_ALLOW_PRIVATE_TOOLS=1` on the server to allow your own network.

## Token Steward: spend tokens wisely

The Steward is on by default (a built-in plugin) and works in three ways:

- **Automatically**
  - Long chats are folded into a running summary written by a **free** model and cached on the chat, so each new message re-sends a few thousand tokens instead of the whole history. You'll see a note such as "folded 14 earlier messages — saved ~38K tokens".
  - Tool output (search results, pages, MCP replies) is trimmed to a sensible size.
- **Audit** (Token Steward page)
  - An efficiency score and where the money goes (free · plan · $ · $$ · $$$).
  - Concrete savings with **Apply** buttons: switch on a token saver, route by savings when premium models dominate, connect free sources, add a monthly cap, or trim too many MCP tools.
- **Advice**
  - **Which model is enough?** sizes a task and shows the cheapest model that clears the quality bar next to the strongest one, with an estimated cost.
  - **Ask the Steward** answers cost questions from your real numbers and the Toolbox catalogue, on a free model when one is connected.

Tune it in **Plugins → Token Steward**:

| Setting | Default | What it does |
|---|---|---|
| `triggerTokens` | 24000 | History size at which compaction starts |
| `keepTokens` | 8000 | Recent turns kept word for word |
| `maxToolChars` | 12000 | Maximum size of one tool result |

## Copilot: your chief of staff

The Copilot can do everything you can do in Hive:
- see what's running
- start sessions (one agent, or several to compare)
- plan and run Dispatcher teams
- write and sharpen prompts
- bring in, steer or stop agents
- read a session's diff and have the Judge pick the best attempt
- check agent health and spend
- research models on the web, and remember what matters

**Its brain**, chosen with the pill at the top of the Copilot:
- **Auto (recommended).** Your **Claude plan** comes first: Claude Code on your worker machine, with Hive connected to it as an MCP server, so it costs no API credits. When the plan's window is used up or the machine is offline, it falls back to the best free model that can use tools, then the best paid one.
- **Claude plan only.**
- **A specific model.**

**It keeps its own token use low.** It plans and judges, and gives the coding to agents, picking cheap or free models for simple parts and strong ones for hard parts (quality first).

**It reviews by itself.** Sessions the Copilot starts, or is asked to watch, are reviewed automatically when they finish:
1. It reads the result and the diff.
2. It brings in an agent to fix anything that's missing.
3. It posts a verdict in the thread: ✅ ready to ship, ⚠️ needs changes, or ❌ failed.

You also get an alert.

## Speed without losing quality

- **Quality comes first.** Only models that clear the quality bar for the kind of work are considered. A faster model wins only against models of *similar* quality, never against a clearly better one.
- **Speed decides between equals.** Each model's speed and its measured response time on your keys break ties. Choose **Fastest** in the Dispatcher, or set the Smart router's preference to `fast`, to lean further towards quick models.
- **No silent waits.** If a model hasn't started answering within 35 seconds (90 s for deep-reasoning models, 2 min for subscription CLIs), chat switches to the next best model and tells you.
- **Housekeeping never blocks a reply.** The Token Steward refreshes chat summaries in the background.
- **Parallel work.** The Dispatcher runs independent parts at the same time.

## Work map

In a session, **Work map** shows which model is reading or editing which file:
- One lane per agent, with the files it owns.
- Every touched file grouped by folder, with the agents on it. The file an agent is on right now pulses.
- Files edited by more than one agent are flagged, so overlaps are caught early.

## Running Hive locally without keys

```bash
node scripts/hive-demo.js
```

This starts a mock model and a mock GitHub, the real server, and a real bridge on a temporary git repo. Open `http://localhost:3300/hive` and sign in as `owner` / `owner123`. `tests/hive-v3.test.js` drives the same harness.
